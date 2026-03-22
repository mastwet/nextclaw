import type { Context } from "hono";
import { getUserById } from "./repositories/platform-repository";
import { renderBrowserAuthPage } from "./auth-browser-page-renderer";
import { sendPlatformEmailAuthCode, verifyPlatformEmailAuthCode } from "./platform-email-otp-service";
import {
  createPlatformAuthSession,
  getPlatformAuthSessionById,
  updatePlatformAuthSessionStatus,
} from "./repositories/platform-auth-session-repository";
import {
  isPlatformAuthServiceError,
  issuePlatformTokenResult,
} from "./services/platform-auth-service";
import { ensurePlatformBootstrap } from "./services/platform-service";
import {
  DEFAULT_PLATFORM_AUTH_POLL_INTERVAL_MS,
  DEFAULT_PLATFORM_AUTH_SESSION_TTL_SECONDS,
  type Env,
} from "./types/platform";
import { apiError, randomOpaqueToken, readJson, readString } from "./utils/platform-utils";

function buildBrowserAuthUrl(c: Context<{ Bindings: Env }>, sessionId: string): string {
  const url = new URL(c.req.url);
  const forwardedProto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = c.req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || c.req.header("host")?.trim() || url.host;
  const protocol = forwardedProto || url.protocol.replace(/:$/, "");
  const query = new URLSearchParams({ sessionId });
  return `${protocol}://${host}/platform/auth/browser?${query.toString()}`;
}

async function loadPlatformAuthSession(c: Context<{ Bindings: Env }>, sessionId: string) {
  const session = await getPlatformAuthSessionById(c.env.NEXTCLAW_PLATFORM_DB, sessionId);
  if (!session) {
    return null;
  }
  if (Date.parse(session.expires_at) > Date.now()) {
    return session;
  }
  if (session.status !== "expired") {
    await updatePlatformAuthSessionStatus(c.env.NEXTCLAW_PLATFORM_DB, {
      id: session.id,
      status: "expired",
      userId: session.user_id,
      updatedAt: new Date().toISOString(),
    });
  }
  return {
    ...session,
    status: "expired" as const,
  };
}

function renderMissingSessionPage(errorMessage: string): Response {
  return renderBrowserAuthPage({
    sessionId: "",
    pageState: "missing",
    expiresAt: null,
    errorMessage,
  });
}

async function loadPendingBrowserAuthSession(
  c: Context<{ Bindings: Env }>,
  sessionId: string,
  email?: string,
): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof loadPlatformAuthSession>>> }
  | { ok: false; response: Response }
> {
  if (!sessionId) {
    return {
      ok: false,
      response: renderMissingSessionPage("Missing authorization session."),
    };
  }

  const session = await loadPlatformAuthSession(c, sessionId);
  if (!session) {
    return {
      ok: false,
      response: renderBrowserAuthPage({
        sessionId,
        pageState: "missing",
        expiresAt: null,
        email,
        errorMessage: "Authorization session not found.",
      }),
    };
  }

  if (session.status === "authorized") {
    return {
      ok: false,
      response: renderBrowserAuthPage({
        sessionId,
        pageState: "authorized",
        expiresAt: session.expires_at,
        email,
        successMessage: "This device is already authorized.",
      }),
    };
  }

  if (session.status === "expired") {
    return {
      ok: false,
      response: renderBrowserAuthPage({
        sessionId,
        pageState: "expired",
        expiresAt: session.expires_at,
        email,
        errorMessage: "Authorization session expired.",
      }),
    };
  }

  return {
    ok: true,
    session,
  };
}

export async function startBrowserAuthHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const sessionId = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + DEFAULT_PLATFORM_AUTH_SESSION_TTL_SECONDS * 1000).toISOString();
  await createPlatformAuthSession(c.env.NEXTCLAW_PLATFORM_DB, {
    id: sessionId,
    expiresAt,
  });
  return c.json({
    ok: true,
    data: {
      sessionId,
      verificationUri: buildBrowserAuthUrl(c, sessionId),
      expiresAt,
      intervalMs: DEFAULT_PLATFORM_AUTH_POLL_INTERVAL_MS,
    },
  });
}

export async function pollBrowserAuthHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const body = await readJson(c);
  const sessionId = readString(body, "sessionId").trim();
  if (!sessionId) {
    return apiError(c, 400, "INVALID_SESSION", "sessionId is required.");
  }

  const session = await loadPlatformAuthSession(c, sessionId);
  if (!session) {
    return apiError(c, 404, "SESSION_NOT_FOUND", "Authorization session not found.");
  }
  if (session.status === "expired") {
    return c.json({
      ok: true,
      data: {
        status: "expired",
        message: "Authorization session expired.",
      },
    });
  }
  if (session.status !== "authorized" || !session.user_id) {
    return c.json({
      ok: true,
      data: {
        status: "pending",
        nextPollMs: DEFAULT_PLATFORM_AUTH_POLL_INTERVAL_MS,
      },
    });
  }

  const user = await getUserById(c.env.NEXTCLAW_PLATFORM_DB, session.user_id);
  if (!user) {
    return apiError(c, 404, "USER_NOT_FOUND", "Authorized account no longer exists.");
  }
  const result = await issuePlatformTokenResult({
    env: c.env,
    user,
  });
  return c.json({
    ok: true,
    data: {
      status: "authorized",
      token: result.token,
      user: result.user,
    },
  });
}

export async function browserAuthPageHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const sessionId = c.req.query("sessionId")?.trim() ?? "";
  if (!sessionId) {
    return renderMissingSessionPage("Missing authorization session.");
  }

  const session = await loadPlatformAuthSession(c, sessionId);
  if (!session) {
    return renderBrowserAuthPage({
      sessionId,
      pageState: "missing",
      expiresAt: null,
      errorMessage: "Authorization session not found.",
    });
  }

  return renderBrowserAuthPage({
    sessionId,
    pageState: session.status,
    expiresAt: session.expires_at,
  });
}

export async function sendBrowserEmailCodeHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const form = await c.req.formData();
  const sessionId = String(form.get("sessionId") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const sessionResult = await loadPendingBrowserAuthSession(c, sessionId, email);
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  try {
    const result = await sendPlatformEmailAuthCode({
      env: c.env,
      email,
      clientIp: null,
      purpose: "browser_auth",
      browserAuthSessionId: sessionResult.session.id,
    });
    return renderBrowserAuthPage({
      sessionId,
      pageState: "pending",
      expiresAt: sessionResult.session.expires_at,
      email: result.email,
      maskedEmail: result.maskedEmail,
      successMessage: "Verification code sent.",
    });
  } catch (error) {
    if (isPlatformAuthServiceError(error)) {
      return renderBrowserAuthPage({
        sessionId,
        pageState: "pending",
        expiresAt: sessionResult.session.expires_at,
        email,
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

export async function authorizeBrowserAuthHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const form = await c.req.formData();
  const sessionId = String(form.get("sessionId") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  const sessionResult = await loadPendingBrowserAuthSession(c, sessionId, email);
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  try {
    const user = await verifyPlatformEmailAuthCode({
      env: c.env,
      email,
      code,
      purpose: "browser_auth",
      browserAuthSessionId: sessionResult.session.id,
    });

    await updatePlatformAuthSessionStatus(c.env.NEXTCLAW_PLATFORM_DB, {
      id: sessionResult.session.id,
      status: "authorized",
      userId: user.id,
      updatedAt: new Date().toISOString(),
    });

    return renderBrowserAuthPage({
      sessionId,
      pageState: "authorized",
      expiresAt: sessionResult.session.expires_at,
      email,
      successMessage: "This device is now linked to your NextClaw Account.",
    });
  } catch (error) {
    if (isPlatformAuthServiceError(error)) {
      return renderBrowserAuthPage({
        sessionId,
        pageState: "pending",
        expiresAt: sessionResult.session.expires_at,
        email,
        errorMessage: error.message,
      });
    }
    throw error;
  }
}
