import type { MessageBus } from "@nextclaw/core";
import { BaseChannel, type OutboundMessage } from "@nextclaw/core";
import { loadWeixinAccount, loadWeixinCursor, saveWeixinCursor, listStoredWeixinAccountIds } from "./weixin-account.store.js";
import {
  extractWeixinMessageText,
  fetchWeixinUpdates,
  sendWeixinTextMessage,
  type WeixinMessage,
} from "./weixin-api.client.js";
import { getWeixinContextToken, setWeixinContextToken } from "./weixin-context-token.store.js";
import {
  DEFAULT_WEIXIN_BASE_URL,
  DEFAULT_WEIXIN_POLL_TIMEOUT_MS,
  resolveConfiguredWeixinAccountIds,
  resolveWeixinAccountSelection,
  type WeixinAccountConfig,
  type WeixinPluginConfig,
} from "./weixin-config.js";

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function isAllowedSender(allowFrom: string[], senderId: string): boolean {
  if (allowFrom.length === 0) {
    return true;
  }
  if (allowFrom.includes(senderId)) {
    return true;
  }
  return senderId.includes("|") && senderId.split("|").some((part) => allowFrom.includes(part));
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

type ResolvedWeixinAccountRuntime = {
  accountId: string;
  token: string;
  enabled: boolean;
  baseUrl: string;
  pollTimeoutMs: number;
  allowFrom: string[];
};

export class WeixinChannel extends BaseChannel<Record<string, unknown>> {
  private readonly pollTasks: Promise<void>[] = [];
  private readonly accountControllers = new Map<string, AbortController>();

  constructor(
    private readonly pluginConfig: WeixinPluginConfig,
    bus: MessageBus,
  ) {
    super(pluginConfig as Record<string, unknown>, bus);
  }

  get name(): string {
    return "weixin";
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    const accountIds = new Set<string>([
      ...resolveConfiguredWeixinAccountIds(this.pluginConfig),
      ...listStoredWeixinAccountIds(),
    ]);
    for (const accountId of accountIds) {
      const controller = new AbortController();
      this.accountControllers.set(accountId, controller);
      this.pollTasks.push(this.runAccountPollingLoop(accountId, controller.signal));
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const controller of this.accountControllers.values()) {
      controller.abort();
    }
    this.accountControllers.clear();
    await Promise.allSettled(this.pollTasks.splice(0, this.pollTasks.length));
  }

  async send(msg: OutboundMessage): Promise<void> {
    const accountId = resolveWeixinAccountSelection(
      this.pluginConfig,
      Array.from(new Set([...resolveConfiguredWeixinAccountIds(this.pluginConfig), ...listStoredWeixinAccountIds()])),
      typeof msg.metadata.accountId === "string" ? msg.metadata.accountId : null,
    );
    if (!accountId) {
      throw new Error("weixin send failed: accountId is required when multiple accounts are configured");
    }

    const account = this.resolveAccountRuntime(accountId);
    if (!account?.enabled || !account.token) {
      throw new Error(`weixin send failed: account "${accountId}" is not logged in`);
    }

    await sendWeixinTextMessage({
      baseUrl: account.baseUrl,
      token: account.token,
      toUserId: msg.chatId,
      text: msg.content,
      contextToken: getWeixinContextToken(account.accountId, msg.chatId),
    });
  }

  private resolveAccountRuntime(accountId: string): ResolvedWeixinAccountRuntime | null {
    const stored = loadWeixinAccount(accountId);
    if (!stored?.token) {
      return null;
    }
    const accountConfig: WeixinAccountConfig = this.pluginConfig.accounts?.[accountId] ?? {};
    return {
      accountId,
      token: stored.token,
      enabled: accountConfig.enabled !== false && this.pluginConfig.enabled !== false,
      baseUrl: accountConfig.baseUrl || stored.baseUrl || this.pluginConfig.baseUrl || DEFAULT_WEIXIN_BASE_URL,
      pollTimeoutMs: this.pluginConfig.pollTimeoutMs ?? DEFAULT_WEIXIN_POLL_TIMEOUT_MS,
      allowFrom: Array.from(
        new Set([...readStringArray(this.pluginConfig.allowFrom), ...readStringArray(accountConfig.allowFrom)]),
      ),
    };
  }

  private async runAccountPollingLoop(accountId: string, signal: AbortSignal): Promise<void> {
    while (this.running && !signal.aborted) {
      try {
        const account = this.resolveAccountRuntime(accountId);
        if (!account?.enabled) {
          await sleep(3_000, signal);
          continue;
        }

        const response = await fetchWeixinUpdates({
          baseUrl: account.baseUrl,
          token: account.token,
          cursor: loadWeixinCursor(accountId),
          timeoutMs: account.pollTimeoutMs,
          signal,
        });

        if (response.get_updates_buf !== undefined) {
          saveWeixinCursor(accountId, response.get_updates_buf);
        }

        for (const message of response.msgs ?? []) {
          await this.handleInboundWeixinMessage(account, message);
        }
      } catch (error) {
        if (!signal.aborted) {
          // eslint-disable-next-line no-console
          console.warn(`[weixin] polling failed for ${accountId}: ${String(error)}`);
          await sleep(3_000, signal);
        }
      }
    }
  }

  private async handleInboundWeixinMessage(
    account: ResolvedWeixinAccountRuntime,
    message: WeixinMessage,
  ): Promise<void> {
    const senderId = message.from_user_id?.trim();
    if (!senderId || senderId === account.accountId) {
      return;
    }
    if (!isAllowedSender(account.allowFrom, senderId)) {
      return;
    }

    const content = extractWeixinMessageText(message);
    if (!content) {
      return;
    }

    const contextToken = message.context_token?.trim();
    if (contextToken) {
      setWeixinContextToken(account.accountId, senderId, contextToken);
    }

    await this.handleMessage({
      senderId,
      chatId: senderId,
      content,
      metadata: {
        accountId: account.accountId,
        account_id: account.accountId,
        message_id: message.message_id ? String(message.message_id) : undefined,
        context_token: contextToken,
      },
    });
  }
}
