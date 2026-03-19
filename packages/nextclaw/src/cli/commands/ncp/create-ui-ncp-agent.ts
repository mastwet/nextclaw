import {
  type Config,
  type CronService,
  DisposableStore,
  type GatewayController,
  type MessageBus,
  type ProviderManager,
  type SessionManager,
} from "@nextclaw/core";
import { McpRegistryService, McpServerLifecycleManager } from "@nextclaw/mcp";
import { DefaultNcpAgentRuntime } from "@nextclaw/ncp-agent-runtime";
import { McpNcpToolRegistryAdapter } from "@nextclaw/ncp-mcp";
import {
  readAssistantReasoningNormalizationMode,
  readAssistantReasoningNormalizationModeFromMetadata,
  writeAssistantReasoningNormalizationModeToMetadata,
  type NcpAssistantReasoningNormalizationMode,
} from "@nextclaw/ncp";
import { createAgentClientFromServer, DefaultNcpAgentBackend } from "@nextclaw/ncp-toolkit";
import type { UiNcpAgent } from "@nextclaw/server";
import type { NextclawExtensionRegistry } from "../plugins.js";
import { NextclawNcpContextBuilder } from "./nextclaw-ncp-context-builder.js";
import { NextclawAgentSessionStore } from "./nextclaw-agent-session-store.js";
import { NextclawNcpToolRegistry } from "./nextclaw-ncp-tool-registry.js";
import { ProviderManagerNcpLLMApi } from "./provider-manager-ncp-llm-api.js";
import { UiNcpRuntimeRegistry } from "./ui-ncp-runtime-registry.js";

export type UiNcpAgentHandle = UiNcpAgent & {
  applyExtensionRegistry?: (extensionRegistry?: NextclawExtensionRegistry) => void;
};

type MessageToolHintsResolver = (params: {
  sessionKey: string;
  channel: string;
  chatId: string;
  accountId?: string | null;
}) => string[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveNativeReasoningNormalizationMode(params: {
  config: Config;
  sessionMetadata: Record<string, unknown>;
}): NcpAssistantReasoningNormalizationMode {
  const runtimeEntry = params.config.ui.ncp.runtimes.native;
  const runtimeMetadata = isRecord(runtimeEntry) ? runtimeEntry : {};

  return (
    readAssistantReasoningNormalizationModeFromMetadata(params.sessionMetadata) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoningNormalization) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoning_normalization) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoningNormalizationMode) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoning_normalization_mode) ??
    "think-tags"
  );
}

function buildPluginRuntimeSnapshotKey(extensionRegistry?: NextclawExtensionRegistry): string {
  const registrations = extensionRegistry?.ncpAgentRuntimes ?? [];
  return registrations
    .map((registration) => [
      registration.pluginId,
      registration.kind,
      registration.label,
      registration.source,
    ].join(":"))
    .join("|");
}

export async function createUiNcpAgent(params: {
  bus: MessageBus;
  providerManager: ProviderManager;
  sessionManager: SessionManager;
  cronService?: CronService | null;
  gatewayController?: GatewayController;
  getConfig: () => Config;
  getExtensionRegistry?: () => NextclawExtensionRegistry | undefined;
  resolveMessageToolHints?: MessageToolHintsResolver;
}): Promise<UiNcpAgentHandle> {
  const sessionStore = new NextclawAgentSessionStore(params.sessionManager);
  const runtimeRegistry = new UiNcpRuntimeRegistry();
  const mcpLifecycleManager = new McpServerLifecycleManager({
    getConfig: params.getConfig,
  });
  const mcpRegistryService = new McpRegistryService({
    getConfig: params.getConfig,
    lifecycleManager: mcpLifecycleManager,
  });
  const mcpPrewarmResults = await mcpRegistryService.prewarmEnabledServers();
  for (const result of mcpPrewarmResults) {
    if (!result.ok) {
      console.warn(`[mcp] Failed to warm ${result.name}: ${result.error}`);
    }
  }
  const mcpToolRegistryAdapter = new McpNcpToolRegistryAdapter(mcpRegistryService);

  runtimeRegistry.register({
    kind: "native",
    label: "Native",
    createRuntime: ({ stateManager, sessionMetadata, setSessionMetadata }) => {
      const reasoningNormalizationMode = resolveNativeReasoningNormalizationMode({
        config: params.getConfig(),
        sessionMetadata,
      });
      if (
        reasoningNormalizationMode !== "off" &&
        readAssistantReasoningNormalizationModeFromMetadata(sessionMetadata) !== reasoningNormalizationMode
      ) {
        setSessionMetadata(
          writeAssistantReasoningNormalizationModeToMetadata(
            sessionMetadata,
            reasoningNormalizationMode,
          ),
        );
      }

      const toolRegistry = new NextclawNcpToolRegistry({
        bus: params.bus,
        providerManager: params.providerManager,
        sessionManager: params.sessionManager,
        cronService: params.cronService,
        gatewayController: params.gatewayController,
        getConfig: params.getConfig,
        getExtensionRegistry: params.getExtensionRegistry,
        getAdditionalTools: (context) =>
          mcpToolRegistryAdapter.listToolsForRun({
            agentId: context.agentId,
          }),
      });
      return new DefaultNcpAgentRuntime({
        contextBuilder: new NextclawNcpContextBuilder({
          sessionManager: params.sessionManager,
          toolRegistry,
          getConfig: params.getConfig,
          resolveMessageToolHints: params.resolveMessageToolHints,
        }),
        llmApi: new ProviderManagerNcpLLMApi(params.providerManager),
        toolRegistry,
        stateManager,
        reasoningNormalizationMode,
      });
    },
  });

  const pluginRuntimeScopes = new Map<string, DisposableStore>();
  let pluginRuntimeSnapshotKey = "";
  let activeExtensionRegistry: NextclawExtensionRegistry | undefined;
  const syncPluginRuntimeRegistrations = (extensionRegistry?: NextclawExtensionRegistry): void => {
    const nextSnapshotKey = buildPluginRuntimeSnapshotKey(extensionRegistry);
    if (nextSnapshotKey === pluginRuntimeSnapshotKey) {
      return;
    }

    pluginRuntimeSnapshotKey = nextSnapshotKey;
    for (const scope of pluginRuntimeScopes.values()) {
      scope.dispose();
    }
    pluginRuntimeScopes.clear();

    for (const registration of extensionRegistry?.ncpAgentRuntimes ?? []) {
      const pluginId = registration.pluginId.trim() || registration.kind;
      let scope = pluginRuntimeScopes.get(pluginId);
      if (!scope) {
        scope = new DisposableStore();
        pluginRuntimeScopes.set(pluginId, scope);
      }
      scope.add(runtimeRegistry.register({
        kind: registration.kind,
        label: registration.label,
        createRuntime: registration.createRuntime,
      }));
    }
  };

  const resolveActiveExtensionRegistry = (): NextclawExtensionRegistry | undefined =>
    activeExtensionRegistry ?? params.getExtensionRegistry?.();

  const refreshPluginRuntimeRegistrations = (): void => {
    syncPluginRuntimeRegistrations(resolveActiveExtensionRegistry());
  };

  refreshPluginRuntimeRegistrations();

  const backend = new DefaultNcpAgentBackend({
    endpointId: "nextclaw-ui-agent",
    sessionStore,
    createRuntime: (runtimeParams) => {
      refreshPluginRuntimeRegistrations();
      return runtimeRegistry.createRuntime(runtimeParams);
    },
  });

  await backend.start();

  return {
    basePath: "/api/ncp/agent",
    agentClientEndpoint: createAgentClientFromServer(backend),
    streamProvider: backend,
    sessionApi: backend,
    listSessionTypes: () => {
      refreshPluginRuntimeRegistrations();
      return runtimeRegistry.listSessionTypes();
    },
    applyExtensionRegistry: (extensionRegistry) => {
      activeExtensionRegistry = extensionRegistry;
      syncPluginRuntimeRegistrations(extensionRegistry);
    },
  };
}
