import type { Context } from "hono";
import {
  appendAuditLog,
  appendLoginAttempt,
  countRecentFailedLoginsByIp,
  ensureUserSecurityRow,
  getUserByEmail,
  getUserById,
  registerUserLoginFailure,
  resetUserLoginSecurity,
  toUserPublicView
} from "../repositories/platform-repository";
import {
  ACCOUNT_LOCK_MINUTES,
  IP_FAILED_ATTEMPT_WINDOW_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS_PER_IP_WINDOW,
  MAX_FAILED_LOGIN_ATTEMPTS_PER_USER,
  type Env
} from "../types/platform";
import { ensurePlatformBootstrap, requireAuthUser } from "../services/platform-service";
import {
  apiError,
  getDefaultUserFreeLimit,
  hashPassword,
  isStrongPassword,
  isValidEmail,
  issueSessionToken,
  normalizeEmail,
  parseIsoDate,
  readClientIp,
  readJson,
  readString,
  verifyPassword
} from "../utils/platform-utils";

async function ensureIpLoginRateLimit(params: {
  c: Context<{ Bindings: Env }>;
  clientIp: string | null;
  now: Date;
}): Promise<Response | null> {
  if (!params.clientIp) {
    return null;
  }

  const failedCountByIp = await countRecentFailedLoginsByIp(
    params.c.env.NEXTCLAW_PLATFORM_DB,
    params.clientIp,
    new Date(params.now.getTime() - IP_FAILED_ATTEMPT_WINDOW_MINUTES * 60_000).toISOString(),
  );
  if (failedCountByIp < MAX_FAILED_LOGIN_ATTEMPTS_PER_IP_WINDOW) {
    return null;
  }

  return apiError(
    params.c,
    429,
    "TOO_MANY_ATTEMPTS",
    "Too many failed login attempts from this IP. Please retry later.",
  );
}

async function ensureLoginUnlocked(params: {
  c: Context<{ Bindings: Env }>;
  user: Awaited<ReturnType<typeof getUserByEmail>>;
  email: string;
  clientIp: string | null;
  now: Date;
  nowIso: string;
}): Promise<Response | null> {
  if (!params.user) {
    return null;
  }

  const security = await ensureUserSecurityRow(params.c.env.NEXTCLAW_PLATFORM_DB, params.user.id, params.nowIso);
  const lockedUntil = parseIsoDate(security.login_locked_until);
  if (lockedUntil && lockedUntil.getTime() > params.now.getTime()) {
    await appendLoginAttempt(params.c.env.NEXTCLAW_PLATFORM_DB, {
      email: params.email,
      ip: params.clientIp,
      success: false,
      reason: "locked",
      createdAt: params.nowIso,
    });
    return apiError(
      params.c,
      423,
      "ACCOUNT_LOCKED",
      `Account is temporarily locked until ${lockedUntil.toISOString()}.`,
    );
  }

  if (lockedUntil) {
    await resetUserLoginSecurity(params.c.env.NEXTCLAW_PLATFORM_DB, params.user.id, params.nowIso);
  }
  return null;
}

async function handleInvalidLogin(params: {
  c: Context<{ Bindings: Env }>;
  user: Awaited<ReturnType<typeof getUserByEmail>>;
  email: string;
  clientIp: string | null;
  nowIso: string;
}): Promise<Response> {
  await appendLoginAttempt(params.c.env.NEXTCLAW_PLATFORM_DB, {
    email: params.email,
    ip: params.clientIp,
    success: false,
    reason: "invalid_credentials",
    createdAt: params.nowIso,
  });

  if (!params.user) {
    return apiError(params.c, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const lockState = await registerUserLoginFailure(
    params.c.env.NEXTCLAW_PLATFORM_DB,
    params.user.id,
    params.nowIso,
    MAX_FAILED_LOGIN_ATTEMPTS_PER_USER,
    ACCOUNT_LOCK_MINUTES,
  );
  if (lockState.lockedUntil) {
    await appendAuditLog(params.c.env.NEXTCLAW_PLATFORM_DB, {
      actorUserId: params.user.id,
      action: "auth.login.locked",
      targetType: "user",
      targetId: params.user.id,
      beforeJson: null,
      afterJson: JSON.stringify({ lockedUntil: lockState.lockedUntil }),
      metadataJson: JSON.stringify({ email: params.email, ip: params.clientIp }),
    });
    return apiError(
      params.c,
      423,
      "ACCOUNT_LOCKED",
      `Account is temporarily locked until ${lockState.lockedUntil}.`,
    );
  }

  return apiError(params.c, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
}

export async function registerHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);

  const body = await readJson(c);
  const email = normalizeEmail(readString(body, "email"));
  const password = readString(body, "password");

  if (!email || !isValidEmail(email)) {
    return apiError(c, 400, "INVALID_EMAIL", "A valid email is required.");
  }
  if (!isStrongPassword(password)) {
    return apiError(c, 400, "WEAK_PASSWORD", "Password must be at least 8 characters.");
  }

  const existing = await getUserByEmail(c.env.NEXTCLAW_PLATFORM_DB, email);
  if (existing) {
    return apiError(c, 409, "EMAIL_EXISTS", "This email is already registered.");
  }

  const now = new Date().toISOString();
  const digest = await hashPassword(password);
  const userId = crypto.randomUUID();
  const inserted = await c.env.NEXTCLAW_PLATFORM_DB.prepare(
    `INSERT INTO users (
      id, email, password_hash, password_salt, role,
      free_limit_usd, free_used_usd, paid_balance_usd,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'user', ?, 0, 0, ?, ?)`
  )
    .bind(
      userId,
      email,
      digest.hash,
      digest.salt,
      getDefaultUserFreeLimit(c.env),
      now,
      now
    )
    .run();
  if (!inserted.success || (inserted.meta.changes ?? 0) !== 1) {
    return apiError(c, 500, "REGISTER_FAILED", "Failed to create user.");
  }

  const user = await getUserById(c.env.NEXTCLAW_PLATFORM_DB, userId);
  if (!user) {
    return apiError(c, 500, "REGISTER_FAILED", "User created but cannot be loaded.");
  }
  await ensureUserSecurityRow(c.env.NEXTCLAW_PLATFORM_DB, user.id, now);

  const token = await issueSessionToken(c.env, user);
  return c.json({
    ok: true,
    data: {
      token,
      user: toUserPublicView(user)
    }
  }, 201);
}

export async function loginHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);

  const body = await readJson(c);
  const email = normalizeEmail(readString(body, "email"));
  const password = readString(body, "password");
  const now = new Date();
  const nowIso = now.toISOString();
  const clientIp = readClientIp(c.req.header("cf-connecting-ip"), c.req.header("x-forwarded-for"));

  const ipRateLimitError = await ensureIpLoginRateLimit({ c, clientIp, now });
  if (ipRateLimitError) {
    return ipRateLimitError;
  }

  if (!email || !password) {
    return apiError(c, 400, "INVALID_CREDENTIALS", "Email and password are required.");
  }

  const user = await getUserByEmail(c.env.NEXTCLAW_PLATFORM_DB, email);
  const lockedError = await ensureLoginUnlocked({
    c,
    user,
    email,
    clientIp,
    now,
    nowIso,
  });
  if (lockedError) {
    return lockedError;
  }

  const valid = user
    ? await verifyPassword(password, user.password_salt, user.password_hash)
    : false;
  if (!valid) {
    return await handleInvalidLogin({
      c,
      user,
      email,
      clientIp,
      nowIso,
    });
  }

  await appendLoginAttempt(c.env.NEXTCLAW_PLATFORM_DB, {
    email,
    ip: clientIp,
    success: true,
    reason: null,
    createdAt: nowIso
  });
  if (!user) {
    return apiError(c, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  await resetUserLoginSecurity(c.env.NEXTCLAW_PLATFORM_DB, user.id, nowIso);

  const token = await issueSessionToken(c.env, user);
  return c.json({
    ok: true,
    data: {
      token,
      user: toUserPublicView(user)
    }
  });
}

export async function meHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);
  const auth = await requireAuthUser(c);
  if (!auth.ok) {
    return auth.response;
  }

  return c.json({
    ok: true,
    data: {
      user: toUserPublicView(auth.user)
    }
  });
}
