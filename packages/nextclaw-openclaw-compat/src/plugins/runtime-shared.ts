import type { Config } from "@nextclaw/core";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.trunc(value);
}

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry));
}

export function resolveChannelConfig(
  cfg: Config | Record<string, unknown> | undefined,
  channel: string,
) {
  const channels = asRecord(asRecord(cfg).channels);
  return asRecord(channels[channel]);
}

export function resolveDefaultAgentId(cfg: Config | Record<string, unknown> | undefined): string {
  const agents = asRecord(cfg).agents;
  const list = Array.isArray(asRecord(agents).list) ? (asRecord(agents).list as unknown[]) : [];
  for (const entry of list) {
    const agent = asRecord(entry);
    if (agent.default === true) {
      return asString(agent.id) ?? "main";
    }
  }
  for (const entry of list) {
    const agentId = asString(asRecord(entry).id);
    if (agentId) {
      return agentId;
    }
  }
  return "main";
}

export function resolveAccountId(value: unknown): string {
  return asString(value) ?? "default";
}

export function resolvePeer(params: Record<string, unknown>): { kind: string; id: string } {
  const peer = asRecord(params.peer);
  return {
    kind: asString(peer.kind) ?? "direct",
    id: asString(peer.id) ?? "default",
  };
}

export function resolveSessionKey(params: {
  channel: string;
  accountId: string;
  agentId: string;
  peerKind: string;
  peerId: string;
}): string {
  return [
    "agent",
    params.agentId,
    params.channel || "unknown",
    params.accountId || "default",
    params.peerKind || "direct",
    params.peerId || "default",
  ].join(":");
}

export function splitTextIntoChunks(text: string, limit: number): string[] {
  const maxLength = Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 4000;
  const normalized = text ?? "";
  if (normalized.length <= maxLength) {
    return [normalized];
  }
  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0 || splitAt < Math.floor(maxLength * 0.5)) {
      splitAt = maxLength;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

export function resolveTextChunkLimit(
  cfg: Config | undefined,
  channel: string,
  _accountId?: string,
  options?: Record<string, unknown>,
): number {
  const channelConfig = resolveChannelConfig(cfg, channel);
  const explicit = asNumber(channelConfig.textChunkLimit);
  if (explicit !== undefined && explicit > 0) {
    return explicit;
  }
  const fallback = asNumber(options?.fallbackLimit);
  return fallback && fallback > 0 ? fallback : 4000;
}

export function hasControlCommand(text?: string): boolean {
  const body = text?.trim() ?? "";
  if (!body) {
    return false;
  }
  if (/^(?:\/|!)[a-z0-9_-]+(?:\s|$)/i.test(body)) {
    return true;
  }
  return /(?:^|\s)(?:\/|!)[a-z0-9_-]+(?:\s|$)/i.test(body);
}

export function resolveCommandAuthorizedFromAuthorizers(params: Record<string, unknown>): boolean {
  const authorizers = Array.isArray(params.authorizers) ? params.authorizers : [];
  const configured = authorizers.filter((entry) => asRecord(entry).configured === true);
  if (configured.length === 0) {
    return true;
  }
  return configured.some((entry) => asRecord(entry).allowed === true);
}

export function resolveAgentRoute(params: Record<string, unknown>): Record<string, unknown> {
  const cfg = params.cfg as Config | undefined;
  const channel = asString(params.channel) ?? "unknown";
  const accountId = resolveAccountId(params.accountId);
  const peer = resolvePeer(params);
  const agentId = resolveDefaultAgentId(cfg);
  const sessionKey = resolveSessionKey({
    channel,
    accountId,
    agentId,
    peerKind: peer.kind,
    peerId: peer.id,
  });
  return {
    agentId,
    accountId,
    channel,
    sessionKey,
    mainSessionKey: sessionKey,
    lastRoutePolicy: "main",
    matchedBy: "default",
  };
}
