import { getUserByEmail } from "./repositories/platform-repository";
import {
  PlatformAuthServiceError,
  findOrCreatePlatformEmailUser,
} from "./services/platform-auth-service";
import type { Env, UserRow } from "./types/platform";
import { isValidEmail, normalizeEmail } from "./utils/platform-utils";

type EmailCodePurpose = "sign_in" | "browser_auth";

type SendPlatformEmailAuthCodeParams = {
  env: Env;
  email: string;
  clientIp: string | null;
  purpose: EmailCodePurpose;
  browserAuthSessionId?: string;
};

type VerifyPlatformEmailAuthCodeParams = {
  env: Env;
  email: string;
  code: string;
  purpose: EmailCodePurpose;
  browserAuthSessionId?: string;
};

type SendPlatformEmailAuthCodeResult = {
  email: string;
  maskedEmail: string;
  expiresAt: string;
  resendAfterSeconds: number;
  debugCode?: string;
};

type EmailAuthCodeRow = {
  id: string;
  email: string;
  purpose: EmailCodePurpose;
  browser_auth_session_id: string | null;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  client_ip: string | null;
  created_at: string;
  updated_at: string;
};

const EMAIL_CODE_TTL_SECONDS = 10 * 60;
const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_CODE_LENGTH = 6;

function readEmailProvider(env: Env): "console" | "resend" | null {
  const raw = env.PLATFORM_AUTH_EMAIL_PROVIDER?.trim().toLowerCase();
  if (raw === "console" || raw === "resend") {
    return raw;
  }
  return null;
}

function shouldExposeDebugCode(env: Env): boolean {
  return env.PLATFORM_AUTH_DEV_EXPOSE_CODE?.trim().toLowerCase() === "true";
}

function ensureEmailInput(email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) {
    throw new PlatformAuthServiceError(400, "INVALID_EMAIL", "A valid email is required.");
  }
  return normalized;
}

function ensureBrowserAuthSessionId(params: {
  purpose: EmailCodePurpose;
  browserAuthSessionId?: string;
}): string | null {
  const sessionId = params.browserAuthSessionId?.trim() ?? "";
  if (params.purpose !== "browser_auth") {
    return null;
  }
  if (!sessionId) {
    throw new PlatformAuthServiceError(400, "INVALID_SESSION", "browserAuthSessionId is required.");
  }
  return sessionId;
}

function maskEmail(email: string): string {
  const [localPart, domainPart = ""] = email.split("@");
  const local = localPart ?? "";
  if (!local || !domainPart) {
    return email;
  }
  if (local.length <= 2) {
    return `${local[0] ?? "*"}*@${domainPart}`;
  }
  return `${local[0] ?? "*"}${"*".repeat(Math.max(1, local.length - 2))}${local.slice(-1)}@${domainPart}`;
}

function generateEmailCode(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(random % 1_000_000).padStart(EMAIL_CODE_LENGTH, "0");
}

async function hashEmailCode(params: {
  email: string;
  purpose: EmailCodePurpose;
  code: string;
  browserAuthSessionId: string | null;
}): Promise<string> {
  const payload = `${params.email}:${params.purpose}:${params.browserAuthSessionId ?? "-"}:${params.code}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function getLatestPendingEmailCode(params: {
  db: D1Database;
  email: string;
  purpose: EmailCodePurpose;
  browserAuthSessionId: string | null;
}): Promise<EmailAuthCodeRow | null> {
  const baseSql = `
    SELECT id, email, purpose, browser_auth_session_id, code_hash, expires_at, consumed_at, client_ip, created_at, updated_at
      FROM platform_email_auth_codes
     WHERE email = ?
       AND purpose = ?
       AND consumed_at IS NULL
       AND expires_at > ?
  `;
  const nowIso = new Date().toISOString();
  if (params.browserAuthSessionId) {
    const row = await params.db.prepare(
      `${baseSql}
       AND browser_auth_session_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`
    )
      .bind(params.email, params.purpose, nowIso, params.browserAuthSessionId)
      .first<EmailAuthCodeRow>();
    return row ?? null;
  }
  const row = await params.db.prepare(
    `${baseSql}
       AND browser_auth_session_id IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`
  )
    .bind(params.email, params.purpose, nowIso)
    .first<EmailAuthCodeRow>();
  return row ?? null;
}

async function revokePendingEmailCodes(params: {
  db: D1Database;
  email: string;
  purpose: EmailCodePurpose;
  browserAuthSessionId: string | null;
  updatedAt: string;
}): Promise<void> {
  const baseSql = `
    UPDATE platform_email_auth_codes
       SET consumed_at = ?,
           updated_at = ?
     WHERE email = ?
       AND purpose = ?
       AND consumed_at IS NULL
  `;
  if (params.browserAuthSessionId) {
    await params.db.prepare(
      `${baseSql}
       AND browser_auth_session_id = ?`
    )
      .bind(params.updatedAt, params.updatedAt, params.email, params.purpose, params.browserAuthSessionId)
      .run();
    return;
  }
  await params.db.prepare(
    `${baseSql}
       AND browser_auth_session_id IS NULL`
  )
    .bind(params.updatedAt, params.updatedAt, params.email, params.purpose)
    .run();
}

async function insertEmailCode(params: {
  db: D1Database;
  email: string;
  purpose: EmailCodePurpose;
  browserAuthSessionId: string | null;
  codeHash: string;
  expiresAt: string;
  clientIp: string | null;
  nowIso: string;
}): Promise<void> {
  const result = await params.db.prepare(
    `INSERT INTO platform_email_auth_codes (
      id, email, purpose, browser_auth_session_id, code_hash, expires_at, consumed_at, client_ip, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      params.email,
      params.purpose,
      params.browserAuthSessionId,
      params.codeHash,
      params.expiresAt,
      params.clientIp,
      params.nowIso,
      params.nowIso,
    )
    .run();
  if (!result.success || (result.meta.changes ?? 0) !== 1) {
    throw new Error("INSERT_PLATFORM_EMAIL_AUTH_CODE_FAILED");
  }
}

async function consumeEmailCode(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db.prepare(
    `UPDATE platform_email_auth_codes
        SET consumed_at = ?,
            updated_at = ?
      WHERE id = ?`
  )
    .bind(nowIso, nowIso, id)
    .run();
}

async function deliverConsoleEmail(params: {
  env: Env;
  email: string;
  code: string;
  purpose: EmailCodePurpose;
  expiresAt: string;
}): Promise<string | undefined> {
  if (!shouldExposeDebugCode(params.env)) {
    throw new PlatformAuthServiceError(
      503,
      "EMAIL_PROVIDER_NOT_CONFIGURED",
      "Console email provider is only allowed in explicit dev mode.",
    );
  }
  console.log(
    `[platform-email-code] ${JSON.stringify({
      email: params.email,
      purpose: params.purpose,
      code: params.code,
      expiresAt: params.expiresAt,
    })}`,
  );
  return params.code;
}

async function deliverResendEmail(params: {
  env: Env;
  email: string;
  code: string;
  purpose: EmailCodePurpose;
  expiresAt: string;
}): Promise<void> {
  const apiKey = params.env.RESEND_API_KEY?.trim();
  const from = params.env.PLATFORM_AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new PlatformAuthServiceError(
      503,
      "EMAIL_PROVIDER_NOT_CONFIGURED",
      "Resend email provider is not fully configured.",
    );
  }
  const expiresAt = new Date(params.expiresAt).toLocaleString("en-US");
  const subject = params.purpose === "browser_auth"
    ? "Authorize your NextClaw device"
    : "Your NextClaw sign-in code";
  const intro = params.purpose === "browser_auth"
    ? "Use this code to authorize your NextClaw device."
    : "Use this code to sign in to NextClaw Platform.";
  const html = `
    <div style="font-family: SF Pro Text, Segoe UI, sans-serif; color: #111827; line-height: 1.6;">
      <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #2563eb;">NextClaw Account</p>
      <h1 style="margin: 0 0 12px; font-size: 24px;">${subject}</h1>
      <p style="margin: 0 0 20px;">${intro}</p>
      <div style="display: inline-block; padding: 14px 18px; border-radius: 18px; background: #0f172a; color: white; font-size: 28px; font-weight: 700; letter-spacing: 0.22em;">
        ${params.code}
      </div>
      <p style="margin: 20px 0 0; color: #475569;">This code expires at ${expiresAt}.</p>
    </div>
  `;
  const text = `${subject}\n\n${intro}\n\nCode: ${params.code}\nExpires at: ${expiresAt}\n`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.email],
      subject,
      html,
      text,
    }),
  });
  if (response.ok) {
    return;
  }
  const raw = await response.text();
  throw new PlatformAuthServiceError(
    502,
    "EMAIL_DELIVERY_FAILED",
    raw || `Email delivery failed (${response.status}).`,
  );
}

async function deliverEmailCode(params: {
  env: Env;
  email: string;
  code: string;
  purpose: EmailCodePurpose;
  expiresAt: string;
}): Promise<string | undefined> {
  const provider = readEmailProvider(params.env);
  if (provider === "console") {
    return await deliverConsoleEmail(params);
  }
  if (provider === "resend") {
    await deliverResendEmail(params);
    return undefined;
  }
  throw new PlatformAuthServiceError(
    503,
    "EMAIL_PROVIDER_NOT_CONFIGURED",
    "No platform email provider is configured.",
  );
}

export async function sendPlatformEmailAuthCode(
  params: SendPlatformEmailAuthCodeParams,
): Promise<SendPlatformEmailAuthCodeResult> {
  const email = ensureEmailInput(params.email);
  const browserAuthSessionId = ensureBrowserAuthSessionId(params);
  const db = params.env.NEXTCLAW_PLATFORM_DB;
  const now = new Date();
  const nowIso = now.toISOString();
  const latestPending = await getLatestPendingEmailCode({
    db,
    email,
    purpose: params.purpose,
    browserAuthSessionId,
  });
  if (latestPending) {
    const resendAt = Date.parse(latestPending.created_at) + EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000;
    if (resendAt > now.getTime()) {
      throw new PlatformAuthServiceError(
        429,
        "CODE_ALREADY_SENT",
        "A verification code was just sent. Please wait before requesting another one.",
      );
    }
  }

  await revokePendingEmailCodes({
    db,
    email,
    purpose: params.purpose,
    browserAuthSessionId,
    updatedAt: nowIso,
  });

  const code = generateEmailCode();
  const expiresAt = new Date(now.getTime() + EMAIL_CODE_TTL_SECONDS * 1000).toISOString();
  const codeHash = await hashEmailCode({
    email,
    purpose: params.purpose,
    code,
    browserAuthSessionId,
  });
  await insertEmailCode({
    db,
    email,
    purpose: params.purpose,
    browserAuthSessionId,
    codeHash,
    expiresAt,
    clientIp: params.clientIp,
    nowIso,
  });
  const debugCode = await deliverEmailCode({
    env: params.env,
    email,
    code,
    purpose: params.purpose,
    expiresAt,
  });
  return {
    email,
    maskedEmail: maskEmail(email),
    expiresAt,
    resendAfterSeconds: EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
    ...(debugCode ? { debugCode } : {}),
  };
}

export async function verifyPlatformEmailAuthCode(
  params: VerifyPlatformEmailAuthCodeParams,
): Promise<UserRow> {
  const email = ensureEmailInput(params.email);
  const code = params.code.trim();
  const browserAuthSessionId = ensureBrowserAuthSessionId(params);
  if (!/^\d{6}$/.test(code)) {
    throw new PlatformAuthServiceError(400, "INVALID_CODE", "Verification code must be 6 digits.");
  }
  const pending = await getLatestPendingEmailCode({
    db: params.env.NEXTCLAW_PLATFORM_DB,
    email,
    purpose: params.purpose,
    browserAuthSessionId,
  });
  if (!pending) {
    throw new PlatformAuthServiceError(400, "CODE_NOT_FOUND", "Verification code not found or expired.");
  }
  const expectedHash = await hashEmailCode({
    email,
    purpose: params.purpose,
    code,
    browserAuthSessionId,
  });
  if (expectedHash !== pending.code_hash) {
    throw new PlatformAuthServiceError(401, "INVALID_CODE", "Verification code is invalid.");
  }
  await consumeEmailCode(params.env.NEXTCLAW_PLATFORM_DB, pending.id, new Date().toISOString());
  const existingUser = await getUserByEmail(params.env.NEXTCLAW_PLATFORM_DB, email);
  if (existingUser) {
    return existingUser;
  }
  return await findOrCreatePlatformEmailUser({
    env: params.env,
    email,
  });
}
