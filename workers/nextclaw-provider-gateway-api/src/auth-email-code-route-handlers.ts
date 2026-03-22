import type { Context } from "hono";
import type { Env } from "./types/platform";
import { sendPlatformEmailAuthCode, verifyPlatformEmailAuthCode } from "./platform-email-otp-service";
import { ensurePlatformBootstrap } from "./services/platform-service";
import { issuePlatformTokenResult, isPlatformAuthServiceError } from "./services/platform-auth-service";
import { apiError, readClientIp, readJson, readString } from "./utils/platform-utils";

export async function sendEmailCodeHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);

  const body = await readJson(c);
  const email = readString(body, "email");
  const clientIp = readClientIp(c.req.header("cf-connecting-ip"), c.req.header("x-forwarded-for"));
  try {
    const result = await sendPlatformEmailAuthCode({
      env: c.env,
      email,
      clientIp,
      purpose: "sign_in",
    });
    return c.json({
      ok: true,
      data: result,
    }, 202);
  } catch (error) {
    if (isPlatformAuthServiceError(error)) {
      return apiError(c, error.status, error.code, error.message);
    }
    throw error;
  }
}

export async function verifyEmailCodeHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  await ensurePlatformBootstrap(c.env);

  const body = await readJson(c);
  const email = readString(body, "email");
  const code = readString(body, "code");
  try {
    const user = await verifyPlatformEmailAuthCode({
      env: c.env,
      email,
      code,
      purpose: "sign_in",
    });
    const result = await issuePlatformTokenResult({
      env: c.env,
      user,
    });
    return c.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (isPlatformAuthServiceError(error)) {
      return apiError(c, error.status, error.code, error.message);
    }
    throw error;
  }
}
