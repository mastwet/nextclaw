import type { Config } from "@nextclaw/core";
import type { PluginReplyDispatchParams } from "./types.js";
import { readStringArray } from "./runtime-shared.js";

export type PluginReplyBridgeDispatcher = (params: PluginReplyDispatchParams) => Promise<void>;

type ReplyDispatchKind = "tool" | "block" | "final";

type ReplyPayload = {
  text?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  [key: string]: unknown;
};

export type ReplyDispatcher = {
  sendToolResult: (payload: ReplyPayload) => boolean;
  sendBlockReply: (payload: ReplyPayload) => boolean;
  sendFinalReply: (payload: ReplyPayload) => boolean;
  waitForIdle: () => Promise<void>;
  getQueuedCounts: () => Record<ReplyDispatchKind, number>;
  markComplete: () => void;
};

type ReplyDispatcherOptions = {
  deliver: (payload: ReplyPayload, info: { kind: ReplyDispatchKind }) => Promise<void>;
  onError?: (error: unknown, info: { kind: ReplyDispatchKind }) => void;
  onIdle?: () => void;
};

type ReplyDispatcherWithTypingOptions = ReplyDispatcherOptions & {
  onReplyStart?: () => void | Promise<void>;
  onIdle?: () => void;
};

function normalizeTextField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.replace(/\r\n/g, "\n").trim() || undefined;
}

function countMediaEntries(ctx: Record<string, unknown>): number {
  const paths = Array.isArray(ctx.MediaPaths) ? ctx.MediaPaths.length : 0;
  const urls = Array.isArray(ctx.MediaUrls) ? ctx.MediaUrls.length : 0;
  const single = ctx.MediaPath || ctx.MediaUrl ? 1 : 0;
  return Math.max(paths, urls, single);
}

export function resolveEnvelopeFormatOptions(_cfg: Config): Record<string, unknown> {
  return {
    includeTimestamp: true,
    includeElapsed: true,
  };
}

export function formatAgentEnvelope(params: Record<string, unknown>): string {
  const channel =
    typeof params.channel === "string" && params.channel.trim() ? params.channel.trim() : "Channel";
  const from =
    typeof params.from === "string" && params.from.trim() ? params.from.trim() : undefined;
  const body = typeof params.body === "string" ? params.body : "";
  const timestamp = params.timestamp instanceof Date ? params.timestamp : undefined;
  const parts = [channel];
  if (from) {
    parts.push(from);
  }
  if (timestamp) {
    parts.push(timestamp.toISOString());
  }
  return `[${parts.join(" ")}] ${body}`.trim();
}

export function finalizeInboundContext(params: Record<string, unknown>): Record<string, unknown> {
  const ctx = { ...params };
  const body = normalizeTextField(ctx.Body) ?? "";
  const rawBody = normalizeTextField(ctx.RawBody);
  const commandBody = normalizeTextField(ctx.CommandBody);
  ctx.Body = body;
  ctx.RawBody = rawBody;
  ctx.CommandBody = commandBody;
  ctx.BodyForAgent = normalizeTextField(ctx.BodyForAgent) ?? commandBody ?? rawBody ?? body;
  ctx.BodyForCommands =
    normalizeTextField(ctx.BodyForCommands) ?? commandBody ?? rawBody ?? body;
  ctx.CommandAuthorized = ctx.CommandAuthorized === true;

  const mediaCount = countMediaEntries(ctx);
  if (mediaCount > 0) {
    const mediaTypes = readStringArray(ctx.MediaTypes);
    const fallbackType =
      typeof ctx.MediaType === "string" && ctx.MediaType.trim()
        ? ctx.MediaType.trim()
        : "application/octet-stream";
    const padded = mediaTypes.slice();
    while (padded.length < mediaCount) {
      padded.push(fallbackType);
    }
    ctx.MediaTypes = padded;
    ctx.MediaType = padded[0] ?? fallbackType;
  }

  return ctx;
}

function createReplyDispatcher(options: ReplyDispatcherOptions): ReplyDispatcher {
  let chain = Promise.resolve();
  let pending = 1;
  let completeCalled = false;
  const counts: Record<ReplyDispatchKind, number> = {
    tool: 0,
    block: 0,
    final: 0,
  };

  const enqueue = (kind: ReplyDispatchKind, payload: ReplyPayload): boolean => {
    counts[kind] += 1;
    pending += 1;
    chain = chain
      .then(async () => {
        await options.deliver(payload, { kind });
      })
      .catch((error) => {
        options.onError?.(error, { kind });
      })
      .finally(() => {
        pending -= 1;
        if (pending === 1 && completeCalled) {
          pending -= 1;
        }
        if (pending === 0) {
          options.onIdle?.();
        }
      });
    return true;
  };

  const markComplete = () => {
    if (completeCalled) {
      return;
    }
    completeCalled = true;
    void Promise.resolve().then(() => {
      if (pending === 1) {
        pending -= 1;
        if (pending === 0) {
          options.onIdle?.();
        }
      }
    });
  };

  return {
    sendToolResult: (payload) => enqueue("tool", payload),
    sendBlockReply: (payload) => enqueue("block", payload),
    sendFinalReply: (payload) => enqueue("final", payload),
    waitForIdle: () => chain,
    getQueuedCounts: () => ({ ...counts }),
    markComplete,
  };
}

export function createReplyDispatcherWithTyping(options: ReplyDispatcherWithTypingOptions) {
  const dispatcher = createReplyDispatcher({
    deliver: options.deliver,
    onError: options.onError,
    onIdle: options.onIdle,
  });

  return {
    dispatcher,
    replyOptions: {
      onReplyStart: options.onReplyStart,
    },
    markDispatchIdle: () => {
      options.onIdle?.();
    },
  };
}

export async function withReplyDispatcher(params: {
  dispatcher: ReplyDispatcher;
  run: () => Promise<Record<string, unknown>>;
  onSettled?: () => void | Promise<void>;
}): Promise<Record<string, unknown>> {
  try {
    return await params.run();
  } finally {
    params.dispatcher.markComplete();
    try {
      await params.dispatcher.waitForIdle();
    } finally {
      await params.onSettled?.();
    }
  }
}

export async function dispatchReplyFromConfig(params: {
  ctx: Record<string, unknown>;
  cfg?: unknown;
  dispatcher: ReplyDispatcher;
  bridgeDispatch: PluginReplyBridgeDispatcher;
  replyOptions?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const finalized = finalizeInboundContext(params.ctx);
  let queuedFinal = false;

  await params.bridgeDispatch({
    ctx: finalized,
    cfg: params.cfg,
    dispatcherOptions: {
      deliver: async (payload, info) => {
        if (info.kind === "tool") {
          params.dispatcher.sendToolResult(payload);
          return;
        }
        if (info.kind === "block") {
          params.dispatcher.sendBlockReply(payload);
          return;
        }
        queuedFinal = params.dispatcher.sendFinalReply(payload);
      },
      onError: () => undefined,
      ...(params.replyOptions ?? {}),
    },
  });

  return {
    queuedFinal,
    counts: params.dispatcher.getQueuedCounts(),
  };
}

export function resolveHumanDelayConfig(_cfg: Config, _agentId: string): undefined {
  return undefined;
}
