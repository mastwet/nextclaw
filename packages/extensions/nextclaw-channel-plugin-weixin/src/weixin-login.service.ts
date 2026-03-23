import { saveWeixinAccount } from "./weixin-account.store.js";
import { fetchWeixinQrCode, fetchWeixinQrStatus } from "./weixin-api.client.js";
import {
  buildLoggedInWeixinPluginConfig,
  DEFAULT_WEIXIN_BASE_URL,
  normalizeWeixinPluginConfig,
  type WeixinPluginConfig,
} from "./weixin-config.js";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

type WeixinLoginParams = {
  pluginConfig?: Record<string, unknown>;
  requestedAccountId?: string | null;
  baseUrl?: string | null;
  verbose?: boolean;
};

type WeixinLoginResult = { pluginConfig: Record<string, unknown>; accountId?: string | null; notes?: string[] };

function resolveWeixinLoginBaseUrl(params: WeixinLoginParams, currentPluginConfig: WeixinPluginConfig): string {
  return params.baseUrl?.trim() || currentPluginConfig.baseUrl || DEFAULT_WEIXIN_BASE_URL;
}

function printWeixinLoginInstructions(qrCodeUrl: string): void {
  console.log("使用微信扫描以下二维码链接完成连接：");
  console.log(qrCodeUrl);
  console.log("");
  console.log("等待扫码确认...");
}

function buildConfirmedLoginResult(params: {
  currentPluginConfig: WeixinPluginConfig;
  requestedAccountId?: string | null;
  fallbackBaseUrl: string;
  status: Awaited<ReturnType<typeof fetchWeixinQrStatus>>;
}): WeixinLoginResult {
  const botToken = params.status.bot_token?.trim();
  const actualAccountId = params.status.ilink_bot_id?.trim() || params.requestedAccountId?.trim();
  const resolvedBaseUrl = params.status.baseurl?.trim() || params.fallbackBaseUrl;
  const authorizedUserId = params.status.ilink_user_id?.trim() || undefined;

  if (!botToken || !actualAccountId) {
    throw new Error("weixin login failed: missing bot token or account id");
  }

  saveWeixinAccount({
    accountId: actualAccountId,
    token: botToken,
    baseUrl: resolvedBaseUrl,
    userId: authorizedUserId,
    savedAt: new Date().toISOString(),
  });

  const notes: string[] = [];
  if (params.requestedAccountId?.trim() && params.requestedAccountId.trim() !== actualAccountId) {
    notes.push(`Weixin account resolved to ${actualAccountId}.`);
  }
  if (authorizedUserId) {
    notes.push(`Authorized initial user: ${authorizedUserId}`);
  }

  return {
    pluginConfig: buildLoggedInWeixinPluginConfig({
      pluginConfig: params.currentPluginConfig,
      accountId: actualAccountId,
      baseUrl: resolvedBaseUrl,
      allowUserId: authorizedUserId,
    }) as Record<string, unknown>,
    accountId: actualAccountId,
    notes,
  };
}

export async function loginWeixinChannel(params: {
  pluginConfig?: Record<string, unknown>;
  requestedAccountId?: string | null;
  baseUrl?: string | null;
  verbose?: boolean;
}): Promise<{ pluginConfig: Record<string, unknown>; accountId?: string | null; notes?: string[] }> {
  const currentPluginConfig: WeixinPluginConfig = normalizeWeixinPluginConfig(params.pluginConfig);
  const baseUrl = resolveWeixinLoginBaseUrl(params, currentPluginConfig);
  const qrCode = await fetchWeixinQrCode({ baseUrl });
  const qrCodeUrl = qrCode.qrcode_img_content?.trim();
  const qrCodeValue = qrCode.qrcode?.trim();

  if (!qrCodeUrl || !qrCodeValue) {
    throw new Error("weixin login failed: QR code is unavailable");
  }

  printWeixinLoginInstructions(qrCodeUrl);

  const deadline = Date.now() + 8 * 60_000;
  let seenScanned = false;

  while (Date.now() < deadline) {
    const status = await fetchWeixinQrStatus({ baseUrl, qrcode: qrCodeValue });
    if (status.status === "scaned" && !seenScanned) {
      console.log("二维码已扫码，请在微信中确认登录。");
      seenScanned = true;
    }

    if (status.status === "confirmed") {
      return buildConfirmedLoginResult({
        currentPluginConfig,
        requestedAccountId: params.requestedAccountId,
        fallbackBaseUrl: baseUrl,
        status,
      });
    }

    if (status.status === "expired") {
      throw new Error("weixin login failed: QR code expired, please retry");
    }

    if (params.verbose) {
      process.stdout.write(".");
    }
    await sleep(2_000);
  }

  throw new Error("weixin login timed out");
}
