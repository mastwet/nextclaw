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
  type Env,
  type UserRow
} from "../types/platform";
import {
  getDefaultUserFreeLimit,
  hashPassword,
  isStrongPassword,
  isValidEmail,
  issueSessionToken,
  normalizeEmail,
  parseIsoDate,
  verifyPassword
} from "../utils/platform-utils";

export class PlatformAuthServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "PlatformAuthServiceError";
  }
}

export function isPlatformAuthServiceError(error: unknown): error is PlatformAuthServiceError {
  return error instanceof PlatformAuthServiceError;
}

async function ensureIpLoginRateLimit(params: {
  env: Env;
  clientIp: string | null;
  now: Date;
}): Promise<void> {
  if (!params.clientIp) {
    return;
  }

  const failedCountByIp = await countRecentFailedLoginsByIp(
    params.env.NEXTCLAW_PLATFORM_DB,
    params.clientIp,
    new Date(params.now.getTime() - IP_FAILED_ATTEMPT_WINDOW_MINUTES * 60_000).toISOString(),
  );
  if (failedCountByIp < MAX_FAILED_LOGIN_ATTEMPTS_PER_IP_WINDOW) {
    return;
  }

  throw new PlatformAuthServiceError(
    429,
    "TOO_MANY_ATTEMPTS",
    "Too many failed login attempts from this IP. Please retry later.",
  );
}

async function ensureUserLoginUnlocked(params: {
  env: Env;
  user: UserRow | null;
  email: string;
  clientIp: string | null;
  now: Date;
  nowIso: string;
}): Promise<void> {
  if (!params.user) {
    return;
  }

  const security = await ensureUserSecurityRow(params.env.NEXTCLAW_PLATFORM_DB, params.user.id, params.nowIso);
  const lockedUntil = parseIsoDate(security.login_locked_until);
  if (lockedUntil && lockedUntil.getTime() > params.now.getTime()) {
    await appendLoginAttempt(params.env.NEXTCLAW_PLATFORM_DB, {
      email: params.email,
      ip: params.clientIp,
      success: false,
      reason: "locked",
      createdAt: params.nowIso,
    });
    throw new PlatformAuthServiceError(
      423,
      "ACCOUNT_LOCKED",
      `Account is temporarily locked until ${lockedUntil.toISOString()}.`,
    );
  }
  if (lockedUntil) {
    await resetUserLoginSecurity(params.env.NEXTCLAW_PLATFORM_DB, params.user.id, params.nowIso);
  }
}

async function handleInvalidCredentials(params: {
  env: Env;
  user: UserRow | null;
  email: string;
  clientIp: string | null;
  nowIso: string;
}): Promise<never> {
  await appendLoginAttempt(params.env.NEXTCLAW_PLATFORM_DB, {
    email: params.email,
    ip: params.clientIp,
    success: false,
    reason: "invalid_credentials",
    createdAt: params.nowIso,
  });

  if (!params.user) {
    throw new PlatformAuthServiceError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const lockState = await registerUserLoginFailure(
    params.env.NEXTCLAW_PLATFORM_DB,
    params.user.id,
    params.nowIso,
    MAX_FAILED_LOGIN_ATTEMPTS_PER_USER,
    ACCOUNT_LOCK_MINUTES,
  );
  if (lockState.lockedUntil) {
    await appendAuditLog(params.env.NEXTCLAW_PLATFORM_DB, {
      actorUserId: params.user.id,
      action: "auth.login.locked",
      targetType: "user",
      targetId: params.user.id,
      beforeJson: null,
      afterJson: JSON.stringify({ lockedUntil: lockState.lockedUntil }),
      metadataJson: JSON.stringify({ email: params.email, ip: params.clientIp }),
    });
    throw new PlatformAuthServiceError(
      423,
      "ACCOUNT_LOCKED",
      `Account is temporarily locked until ${lockState.lockedUntil}.`,
    );
  }

  throw new PlatformAuthServiceError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
}

export async function registerPlatformUser(params: {
  env: Env;
  email: string;
  password: string;
}): Promise<UserRow> {
  const email = normalizeEmail(params.email);
  const password = params.password;
  if (!email || !isValidEmail(email)) {
    throw new PlatformAuthServiceError(400, "INVALID_EMAIL", "A valid email is required.");
  }
  if (!isStrongPassword(password)) {
    throw new PlatformAuthServiceError(400, "WEAK_PASSWORD", "Password must be at least 8 characters.");
  }

  const existing = await getUserByEmail(params.env.NEXTCLAW_PLATFORM_DB, email);
  if (existing) {
    throw new PlatformAuthServiceError(409, "EMAIL_EXISTS", "This email is already registered.");
  }

  const now = new Date().toISOString();
  const digest = await hashPassword(password);
  const userId = crypto.randomUUID();
  const inserted = await params.env.NEXTCLAW_PLATFORM_DB.prepare(
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
      getDefaultUserFreeLimit(params.env),
      now,
      now
    )
    .run();
  if (!inserted.success || (inserted.meta.changes ?? 0) !== 1) {
    throw new PlatformAuthServiceError(500, "REGISTER_FAILED", "Failed to create user.");
  }

  const user = await getUserById(params.env.NEXTCLAW_PLATFORM_DB, userId);
  if (!user) {
    throw new PlatformAuthServiceError(500, "REGISTER_FAILED", "User created but cannot be loaded.");
  }
  await ensureUserSecurityRow(params.env.NEXTCLAW_PLATFORM_DB, user.id, now);
  return user;
}

export async function authenticatePlatformUser(params: {
  env: Env;
  email: string;
  password: string;
  clientIp: string | null;
  now?: Date;
}): Promise<UserRow> {
  const email = normalizeEmail(params.email);
  const password = params.password;
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();

  if (!email || !password) {
    throw new PlatformAuthServiceError(400, "INVALID_CREDENTIALS", "Email and password are required.");
  }

  await ensureIpLoginRateLimit({
    env: params.env,
    clientIp: params.clientIp,
    now
  });

  const user = await getUserByEmail(params.env.NEXTCLAW_PLATFORM_DB, email);
  await ensureUserLoginUnlocked({
    env: params.env,
    user,
    email,
    clientIp: params.clientIp,
    now,
    nowIso
  });

  const valid = user
    ? await verifyPassword(password, user.password_salt, user.password_hash)
    : false;
  if (!valid) {
    return await handleInvalidCredentials({
      env: params.env,
      user,
      email,
      clientIp: params.clientIp,
      nowIso
    });
  }

  await appendLoginAttempt(params.env.NEXTCLAW_PLATFORM_DB, {
    email,
    ip: params.clientIp,
    success: true,
    reason: null,
    createdAt: nowIso
  });

  if (!user) {
    throw new PlatformAuthServiceError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  await resetUserLoginSecurity(params.env.NEXTCLAW_PLATFORM_DB, user.id, nowIso);
  return user;
}

export async function issuePlatformTokenResult(params: {
  env: Env;
  user: UserRow;
}): Promise<{
  token: string;
  user: ReturnType<typeof toUserPublicView>;
}> {
  return {
    token: await issueSessionToken(params.env, params.user),
    user: toUserPublicView(params.user)
  };
}
