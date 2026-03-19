import type { Context } from "hono";
import { appendProfitLedger, listRuntimeModelSpecs, readBillingSnapshot } from "../repositories/platform-repository";
import { chargeFromStream, chargeUsage, computeChargeSplit, ensurePlatformBootstrap, requireAuthUser } from "../services/platform-service";
import {
  MODEL_MAP,
  SUPPORTED_MODELS,
  type BillingSnapshot,
  type ChatCompletionRequest,
  type Env,
  type RuntimeModelSpec,
  type SupportedModelSpec
} from "../types/platform";
import {
  extractUsageCounters,
  getDashscopeApiBase,
  getRequestFlatUsdPerRequest,
  normalizeIdempotencyKey,
  openaiError,
  resolveMaxCompletionTokens,
  roundUsd,
  sanitizeResponseHeaders,
  withTrailingSlash,
  estimateUsage
} from "../utils/platform-utils";

type ChatRequestParseResult =
  | { ok: true; body: ChatCompletionRequest }
  | { ok: false; response: Response };

type RuntimeModelResolutionResult =
  | { ok: true; requestedModel: string; resolvedModelSpec: RuntimeModelSpec }
  | { ok: false; response: Response };

function parseChatCompletionRequest(
  c: Context<{ Bindings: Env }>,
  body: ChatCompletionRequest | null,
): ChatRequestParseResult {
  if (!body) {
    return {
      ok: false,
      response: openaiError(c, 400, "Invalid JSON payload.", "invalid_request_error"),
    };
  }
  if (typeof body.model !== "string" || body.model.trim().length === 0) {
    return {
      ok: false,
      response: openaiError(c, 400, "model is required.", "invalid_request_error"),
    };
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return {
      ok: false,
      response: openaiError(c, 400, "messages must be a non-empty array.", "invalid_request_error"),
    };
  }
  return { ok: true, body };
}

async function resolveRequestedRuntimeModel(params: {
  c: Context<{ Bindings: Env }>;
  body: ChatCompletionRequest;
}): Promise<RuntimeModelResolutionResult> {
  const requestedModel = params.body.model.trim();
  const runtimeModelSpecs = await resolveRuntimeModelSpecs(params.c.env);
  const runtimeModelMap = new Map(runtimeModelSpecs.map((model) => [model.id, model]));
  const runtimeModelSpec = runtimeModelMap.get(requestedModel);
  const fallbackModelSpec = MODEL_MAP.get(requestedModel);
  if (!runtimeModelSpec && !fallbackModelSpec) {
    return {
      ok: false,
      response: openaiError(
        params.c,
        400,
        `Model '${requestedModel}' is not available in NextClaw catalog.`,
        "model_not_found",
      ),
    };
  }

  return {
    ok: true,
    requestedModel,
    resolvedModelSpec: runtimeModelSpec ?? toStaticRuntimeModelSpec(fallbackModelSpec!, params.c.env),
  };
}

async function readChatCompletionBody(c: Context<{ Bindings: Env }>): Promise<ChatCompletionRequest | null> {
  try {
    return await c.req.json<ChatCompletionRequest>();
  } catch {
    return null;
  }
}

async function createUpstreamChatResponse(params: {
  body: ChatCompletionRequest;
  modelSpec: RuntimeModelSpec;
}): Promise<Response> {
  const upstreamUrl = new URL("chat/completions", withTrailingSlash(params.modelSpec.apiBase)).toString();
  const upstreamPayload: Record<string, unknown> = {
    ...params.body,
    model: params.modelSpec.upstreamModel,
  };

  return await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.modelSpec.accessToken.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamPayload),
  });
}

function buildRequestId(c: Context<{ Bindings: Env }>, userId: string): string {
  const idempotencyKey = normalizeIdempotencyKey(c.req.header("x-idempotency-key"));
  return idempotencyKey ? `chat:${userId}:${idempotencyKey}` : crypto.randomUUID();
}

async function appendChatProfitLedger(params: {
  db: D1Database;
  requestId: string;
  userId: string;
  modelSpec: RuntimeModelSpec;
  chargeUsd: number;
  usage: { promptTokens: number; completionTokens: number };
}): Promise<void> {
  const upstreamCostUsd = calculateUpstreamCostUsd(params.usage, params.modelSpec);
  await appendProfitLedger(params.db, {
    requestId: params.requestId,
    userId: params.userId,
    publicModelId: params.modelSpec.id,
    providerAccountId: params.modelSpec.providerAccountId,
    upstreamModel: params.modelSpec.upstreamModel,
    chargeUsd: params.chargeUsd,
    upstreamCostUsd,
    grossMarginUsd: roundUsd(params.chargeUsd - upstreamCostUsd),
  });
}

function buildEstimatedCharge(params: {
  env: Env;
  body: ChatCompletionRequest;
  modelSpec: RuntimeModelSpec;
}): {
  usageEstimate: ReturnType<typeof estimateUsage>;
  estimatedCost: number;
} {
  const usageEstimate = estimateUsage(params.body.messages, resolveMaxCompletionTokens(params.body));
  const estimatedCost =
    calculateUsageUsd(
      usageEstimate,
      params.modelSpec.sellInputUsdPer1M,
      params.modelSpec.sellOutputUsdPer1M,
    ) + getRequestFlatUsdPerRequest(params.env);

  return {
    usageEstimate,
    estimatedCost,
  };
}

async function handleStreamingChatCompletion(params: {
  c: Context<{ Bindings: Env }>;
  authUserId: string;
  modelSpec: RuntimeModelSpec;
  upstreamResponse: Response;
  usageEstimate: ReturnType<typeof estimateUsage>;
  requestId: string;
  billingModelSpec: SupportedModelSpec;
}): Promise<Response> {
  const [clientStream, billingStream] = params.upstreamResponse.body!.tee();
  if (params.upstreamResponse.ok) {
    params.c.executionCtx.waitUntil(
      chargeFromStream({
        env: params.c.env,
        userId: params.authUserId,
        modelSpec: params.billingModelSpec,
        stream: billingStream,
        fallback: params.usageEstimate,
        requestId: params.requestId,
        onSettled: async ({ usage, result }) => {
          if (!result.ok) {
            return;
          }
          await appendChatProfitLedger({
            db: params.c.env.NEXTCLAW_PLATFORM_DB,
            requestId: params.requestId,
            userId: params.authUserId,
            modelSpec: params.modelSpec,
            chargeUsd: result.split.totalCostUsd,
            usage,
          });
        },
      }),
    );
  }

  return new Response(clientStream, {
    status: params.upstreamResponse.status,
    headers: sanitizeResponseHeaders(params.upstreamResponse.headers),
  });
}

async function handleNonStreamingChatCompletion(params: {
  c: Context<{ Bindings: Env }>;
  authUserId: string;
  requestedModel: string;
  modelSpec: RuntimeModelSpec;
  upstreamResponse: Response;
  usageEstimate: ReturnType<typeof estimateUsage>;
  requestId: string;
  billingModelSpec: SupportedModelSpec;
}): Promise<Response> {
  const rawText = await params.upstreamResponse.text();
  if (!params.upstreamResponse.ok) {
    return new Response(rawText, {
      status: params.upstreamResponse.status,
      headers: sanitizeResponseHeaders(params.upstreamResponse.headers),
    });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return openaiError(params.c, 502, "Upstream returned invalid JSON.", "upstream_invalid_response");
  }

  const usage = extractUsageCounters(parsed, params.usageEstimate);
  const charged = await chargeUsage(
    params.c.env,
    params.authUserId,
    params.billingModelSpec,
    usage,
    params.requestId,
  );
  if (!charged.ok) {
    return insufficientQuotaSettlementResponse(params.c);
  }

  await appendChatProfitLedger({
    db: params.c.env.NEXTCLAW_PLATFORM_DB,
    requestId: params.requestId,
    userId: params.authUserId,
    modelSpec: params.modelSpec,
    chargeUsd: charged.split.totalCostUsd,
    usage,
  });

  parsed.model = params.requestedModel;
  return params.c.json(parsed);
}

export async function healthHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  return c.json({
    ok: true,
    data: {
      status: "ok",
      service: "nextclaw-provider-gateway-api",
      authRequired: true,
      billingMode: "usd-only"
    }
  });
}

export async function modelsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const modelSpecs = await resolveRuntimeModelSpecs(c.env);
  return c.json({
    object: "list",
    data: modelSpecs.map((model) => ({
      id: model.id,
      object: "model",
      created: 0,
      owned_by: "nextclaw",
      display_name: model.displayName
    }))
  });
}

export async function usageHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const auth = await requireAuthUser(c);
  if (!auth.ok) {
    return auth.response;
  }

  const snapshot = await readBillingSnapshot(c.env.NEXTCLAW_PLATFORM_DB, auth.user.id);
  if (!snapshot) {
    return openaiError(c, 404, "User not found.", "user_not_found");
  }

  return c.json({
    object: "nextclaw.usage",
    data: {
      totalCostUsd: roundUsd(snapshot.user.free_used_usd + Math.max(0, snapshot.user.paid_balance_usd)),
      freeQuotaUsdLimit: roundUsd(snapshot.user.free_limit_usd),
      freeQuotaUsdUsed: roundUsd(snapshot.user.free_used_usd),
      freeQuotaUsdRemaining: roundUsd(Math.max(0, snapshot.user.free_limit_usd - snapshot.user.free_used_usd)),
      paidBalanceUsd: roundUsd(snapshot.user.paid_balance_usd),
      globalFreeUsdLimit: roundUsd(snapshot.globalFreeLimitUsd),
      globalFreeUsdUsed: roundUsd(snapshot.globalFreeUsedUsd),
      globalFreeUsdRemaining: roundUsd(Math.max(0, snapshot.globalFreeLimitUsd - snapshot.globalFreeUsedUsd)),
      updatedAt: snapshot.user.updated_at
    }
  });
}

export async function chatCompletionsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);

  const auth = await requireAuthUser(c);
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = parseChatCompletionRequest(c, await readChatCompletionBody(c));
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.body;

  const modelResolution = await resolveRequestedRuntimeModel({ c, body });
  if (!modelResolution.ok) {
    return modelResolution.response;
  }
  const { requestedModel, resolvedModelSpec } = modelResolution;

  if (!resolvedModelSpec.accessToken || resolvedModelSpec.accessToken.trim().length === 0) {
    return openaiError(c, 503, "Upstream provider is not configured.", "service_unavailable");
  }

  const { usageEstimate, estimatedCost } = buildEstimatedCharge({
    env: c.env,
    body,
    modelSpec: resolvedModelSpec,
  });

  const precheckSnapshot = await readBillingSnapshot(c.env.NEXTCLAW_PLATFORM_DB, auth.user.id);
  if (!precheckSnapshot) {
    return openaiError(c, 404, "User not found.", "user_not_found");
  }

  const precheckSplit = computeChargeSplit(precheckSnapshot, estimatedCost);
  if (!precheckSplit) {
    return insufficientQuotaPrecheckResponse(c, precheckSnapshot);
  }

  const upstreamResponse = await createUpstreamChatResponse({
    body,
    modelSpec: resolvedModelSpec,
  });
  const requestId = buildRequestId(c, auth.user.id);

  const billingModelSpec = toBillingModelSpec(resolvedModelSpec);

  if (body.stream === true && upstreamResponse.body) {
    return await handleStreamingChatCompletion({
      c,
      authUserId: auth.user.id,
      modelSpec: resolvedModelSpec,
      upstreamResponse,
      usageEstimate,
      requestId,
      billingModelSpec,
    });
  }

  return await handleNonStreamingChatCompletion({
    c,
    authUserId: auth.user.id,
    requestedModel,
    modelSpec: resolvedModelSpec,
    upstreamResponse,
    usageEstimate,
    requestId,
    billingModelSpec,
  });
}

function calculateUsageUsd(usage: { promptTokens: number; completionTokens: number }, inputUsdPer1M: number, outputUsdPer1M: number): number {
  return (usage.promptTokens / 1_000_000) * inputUsdPer1M +
    (usage.completionTokens / 1_000_000) * outputUsdPer1M;
}

function toStaticRuntimeModelSpec(model: SupportedModelSpec, env: Env): RuntimeModelSpec {
  return {
    id: model.id,
    displayName: model.displayName,
    upstreamModel: model.upstreamModel,
    apiBase: getDashscopeApiBase(env),
    accessToken: env.DASHSCOPE_API_KEY?.trim() ?? "",
    providerAccountId: null,
    sellInputUsdPer1M: model.inputUsdPer1M,
    sellOutputUsdPer1M: model.outputUsdPer1M,
    upstreamInputUsdPer1M: model.inputUsdPer1M,
    upstreamOutputUsdPer1M: model.outputUsdPer1M
  };
}

async function resolveRuntimeModelSpecs(env: Env): Promise<RuntimeModelSpec[]> {
  const dynamic = await listRuntimeModelSpecs(env.NEXTCLAW_PLATFORM_DB);
  if (dynamic.length > 0) {
    return dynamic;
  }
  return SUPPORTED_MODELS.map((model) => toStaticRuntimeModelSpec(model, env));
}

function toBillingModelSpec(spec: RuntimeModelSpec): SupportedModelSpec {
  return {
    id: spec.id,
    upstreamModel: spec.upstreamModel,
    displayName: spec.displayName,
    inputUsdPer1M: spec.sellInputUsdPer1M,
    outputUsdPer1M: spec.sellOutputUsdPer1M
  };
}

function calculateUpstreamCostUsd(
  usage: { promptTokens: number; completionTokens: number },
  model: RuntimeModelSpec
): number {
  return roundUsd(calculateUsageUsd(usage, model.upstreamInputUsdPer1M, model.upstreamOutputUsdPer1M));
}

function insufficientQuotaPrecheckResponse(
  c: Context<{ Bindings: Env }>,
  snapshot: BillingSnapshot
): Response {
  return c.json(
    {
      error: {
        message: "Quota exceeded. Free quota and paid balance are both insufficient.",
        type: "insufficient_quota",
        param: null,
        code: "insufficient_quota"
      },
      usage: {
        freeQuotaUsdLimit: roundUsd(snapshot.user.free_limit_usd),
        freeQuotaUsdUsed: roundUsd(snapshot.user.free_used_usd),
        freeQuotaUsdRemaining: roundUsd(Math.max(0, snapshot.user.free_limit_usd - snapshot.user.free_used_usd)),
        paidBalanceUsd: roundUsd(snapshot.user.paid_balance_usd),
        globalFreeUsdRemaining: roundUsd(Math.max(0, snapshot.globalFreeLimitUsd - snapshot.globalFreeUsedUsd))
      }
    },
    429
  );
}

function insufficientQuotaSettlementResponse(c: Context<{ Bindings: Env }>): Response {
  return c.json(
    {
      error: {
        message: "Quota exceeded before final settlement.",
        type: "insufficient_quota",
        param: null,
        code: "insufficient_quota"
      }
    },
    429
  );
}
