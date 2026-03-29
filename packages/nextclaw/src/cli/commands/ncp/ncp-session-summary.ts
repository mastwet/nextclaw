import type { NcpMessage, NcpSessionStatus, NcpSessionSummary } from "@nextclaw/ncp";

export function createNcpSessionSummary(params: {
  sessionId: string;
  messages: readonly NcpMessage[];
  updatedAt: string;
  status: NcpSessionStatus;
  metadata?: Record<string, unknown>;
}): NcpSessionSummary {
  return {
    sessionId: params.sessionId,
    messageCount: params.messages.length,
    updatedAt: params.updatedAt,
    status: params.status,
    ...(params.metadata ? { metadata: structuredClone(params.metadata) } : {}),
  };
}
