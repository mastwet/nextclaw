import { parseAgentScopedSessionKey } from "@nextclaw/core";
import type { UiChatRuntime } from "@nextclaw/server";
import type { GatewayAgentRuntimePool } from "./agent-runtime-pool.js";
import type { UiChatRunCoordinator } from "./ui-chat-run-coordinator.js";

type CreateServiceUiChatRuntimeParams = {
  runtimePool: GatewayAgentRuntimePool;
  runCoordinator: UiChatRunCoordinator;
};

export function createServiceUiChatRuntime(params: CreateServiceUiChatRuntimeParams): UiChatRuntime {
  return {
    listSessionTypes: async () => {
      const options = params.runtimePool.listAvailableEngineKinds().map((value) => ({
        value,
        label: resolveUiSessionTypeLabel(value)
      }));
      return {
        defaultType: "native",
        options
      };
    },
    getCapabilities: async (request) => {
      const sessionKey =
        typeof request.sessionKey === "string" && request.sessionKey.trim().length > 0
          ? request.sessionKey.trim()
          : `ui:capability:${Date.now().toString(36)}`;
      const capability = params.runtimePool.supportsTurnAbort({
        sessionKey,
        agentId: typeof request.agentId === "string" ? request.agentId : undefined,
        channel: "ui",
        chatId: "web-ui",
        metadata: {}
      });
      return {
        stopSupported: capability.supported,
        ...(capability.reason ? { stopReason: capability.reason } : {})
      };
    },
    processTurn: async (request) => {
      const resolved = resolveChatTurnParams(request);
      const reply = await params.runtimePool.processDirect({
        content: request.message,
        sessionKey: resolved.sessionKey,
        channel: resolved.channel,
        chatId: resolved.chatId,
        agentId: resolved.inferredAgentId,
        metadata: resolved.metadata
      });
      return buildTurnResult({
        reply,
        sessionKey: resolved.sessionKey,
        inferredAgentId: resolved.inferredAgentId,
        model: resolved.model
      });
    },
    startTurnRun: async (request) => {
      return params.runCoordinator.startRun(request);
    },
    listRuns: async (request) => {
      return params.runCoordinator.listRuns(request);
    },
    getRun: async (request) => {
      return params.runCoordinator.getRun(request);
    },
    streamRun: async function* (request) {
      for await (const event of params.runCoordinator.streamRun(request)) {
        yield event;
      }
    },
    stopTurn: async (request) => {
      return await params.runCoordinator.stopRun(request);
    },
    processTurnStream: async function* (request) {
      const run = params.runCoordinator.startRun(request);
      for await (const event of params.runCoordinator.streamRun({ runId: run.runId })) {
        yield event;
      }
    }
  };
}

function resolveChatTurnParams(params: {
  message: string;
  sessionKey?: string;
  agentId?: string;
  channel?: string;
  chatId?: string;
  model?: string;
  metadata?: Record<string, unknown>;
  runId?: string;
}) {
  const sessionKey =
    typeof params.sessionKey === "string" && params.sessionKey.trim().length > 0
      ? params.sessionKey.trim()
      : `ui:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  const inferredAgentId =
    typeof params.agentId === "string" && params.agentId.trim().length > 0
      ? params.agentId.trim()
      : parseAgentScopedSessionKey(sessionKey)?.agentId;
  const model = typeof params.model === "string" && params.model.trim().length > 0 ? params.model.trim() : undefined;
  const metadata =
    params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
      ? { ...params.metadata }
      : {};
  if (model) {
    metadata.model = model;
  }
  const runId = typeof params.runId === "string" && params.runId.trim().length > 0
    ? params.runId.trim()
    : undefined;
  return {
    runId,
    sessionKey,
    inferredAgentId,
    model,
    metadata,
    channel: typeof params.channel === "string" && params.channel.trim().length > 0 ? params.channel : "ui",
    chatId: typeof params.chatId === "string" && params.chatId.trim().length > 0 ? params.chatId : "web-ui"
  };
}

function buildTurnResult(params: {
  reply: string;
  sessionKey: string;
  inferredAgentId?: string;
  model?: string;
}) {
  return {
    reply: params.reply,
    sessionKey: params.sessionKey,
    ...(params.inferredAgentId ? { agentId: params.inferredAgentId } : {}),
    ...(params.model ? { model: params.model } : {})
  };
}

function resolveUiSessionTypeLabel(sessionType: string): string {
  if (sessionType === "native") {
    return "Native";
  }
  return sessionType
    .trim()
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || sessionType;
}
