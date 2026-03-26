import type * as NextclawCore from "@nextclaw/core";
import type { PluginChannelBinding, PluginUiMetadata } from "@nextclaw/openclaw-compat";
import { startUiServer, type MarketplaceApiConfig, type UiServerEvent, type UiRemoteAccessHost } from "@nextclaw/server";
import { openBrowser } from "../utils.js";
import type { GatewayControllerImpl } from "../gateway/controller.js";
import type { GatewayAgentRuntimePool } from "./agent-runtime-pool.js";
import { createUiNcpAgent, type UiNcpAgentHandle } from "./ncp/create-ui-ncp-agent.js";
import type { NextclawExtensionRegistry } from "./plugins.js";
import { createDeferredUiNcpAgent, type DeferredUiNcpAgentController } from "./service-deferred-ncp-agent.js";
import { createServiceUiChatRuntime } from "./service-ui-chat-runtime.js";
import { UiChatRunCoordinator } from "./ui-chat-run-coordinator.js";

type Config = NextclawCore.Config;
type MessageBus = NextclawCore.MessageBus;
type SessionManager = NextclawCore.SessionManager;
type ProviderManager = NextclawCore.ProviderManager;
type CronService = NextclawCore.CronService;

export type UiStartupHandle = {
  deferredNcpAgent: DeferredUiNcpAgentController;
};

export async function startUiShell(params: {
  uiConfig: Config["ui"];
  uiStaticDir: string | null;
  cronService: CronService;
  runtimePool: GatewayAgentRuntimePool;
  sessionManager: SessionManager;
  bus: MessageBus;
  getConfig: () => Config;
  configPath: string;
  productVersion: string;
  getPluginChannelBindings: () => PluginChannelBinding[];
  getPluginUiMetadata: () => PluginUiMetadata[];
  marketplace: MarketplaceApiConfig;
  remoteAccess: UiRemoteAccessHost;
  openBrowserWindow: boolean;
  applyLiveConfigReload?: () => Promise<void>;
}): Promise<UiStartupHandle | null> {
  if (!params.uiConfig.enabled) {
    return null;
  }

  let publishUiEvent: ((event: UiServerEvent) => void) | null = null;
  params.runtimePool.setSystemSessionUpdatedHandler(({ sessionKey, message }) => {
    if (!publishUiEvent) {
      return;
    }
    if (!message.chatId.startsWith("ui:")) {
      return;
    }
    publishUiEvent({
      type: "session.updated",
      payload: {
        sessionKey,
      },
    });
  });

  const runCoordinator = new UiChatRunCoordinator({
    runtimePool: params.runtimePool,
    sessionManager: params.sessionManager,
    onRunUpdated: (run) => {
      publishUiEvent?.({ type: "run.updated", payload: { run } });
    },
  });
  const deferredNcpAgent = createDeferredUiNcpAgent();
  const uiServer = startUiServer({
    host: params.uiConfig.host,
    port: params.uiConfig.port,
    configPath: params.configPath,
    productVersion: params.productVersion,
    staticDir: params.uiStaticDir ?? undefined,
    applyLiveConfigReload: params.applyLiveConfigReload,
    cronService: params.cronService,
    marketplace: params.marketplace,
    remoteAccess: params.remoteAccess,
    getPluginChannelBindings: params.getPluginChannelBindings,
    getPluginUiMetadata: params.getPluginUiMetadata,
    ncpAgent: deferredNcpAgent.agent,
    chatRuntime: createServiceUiChatRuntime({
      runtimePool: params.runtimePool,
      runCoordinator,
    }),
  });
  publishUiEvent = uiServer.publish;
  const uiUrl = `http://${uiServer.host}:${uiServer.port}`;
  console.log(`✓ UI API: ${uiUrl}/api`);
  if (params.uiStaticDir) {
    console.log(`✓ UI frontend: ${uiUrl}`);
  }
  if (params.openBrowserWindow) {
    openBrowser(uiUrl);
  }

  return {
    deferredNcpAgent,
  };
}

export async function startDeferredGatewayStartup(params: {
  uiStartup: UiStartupHandle | null;
  bus: MessageBus;
  sessionManager: SessionManager;
  providerManager: ProviderManager;
  cronService: CronService;
  gatewayController: GatewayControllerImpl;
  getConfig: () => Config;
  getExtensionRegistry: () => NextclawExtensionRegistry | undefined;
  resolveMessageToolHints: (params: { channel: string; accountId?: string | null }) => string[];
  startPluginGateways: () => Promise<void>;
  startChannels: () => Promise<void>;
  wakeFromRestartSentinel: () => Promise<void>;
  onNcpAgentReady: (agent: UiNcpAgentHandle) => void;
}): Promise<void> {
  if (params.uiStartup) {
    try {
      const ncpAgent = await createUiNcpAgent({
        bus: params.bus,
        providerManager: params.providerManager,
        sessionManager: params.sessionManager,
        cronService: params.cronService,
        gatewayController: params.gatewayController,
        getConfig: params.getConfig,
        getExtensionRegistry: params.getExtensionRegistry,
        resolveMessageToolHints: ({ channel, accountId }) =>
          params.resolveMessageToolHints({ channel, accountId }),
      });
      params.onNcpAgentReady(ncpAgent);
      params.uiStartup.deferredNcpAgent.activate(ncpAgent);
      console.log("✓ UI NCP agent: ready");
    } catch (error) {
      console.error(`UI NCP agent startup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await params.startPluginGateways();
  await params.startChannels();
  await params.wakeFromRestartSentinel();
  console.log("✓ Deferred startup: plugin gateways and channels settled");
}

export async function runGatewayRuntimeLoop(params: {
  runtimePool: GatewayAgentRuntimePool;
  startDeferredStartup: () => Promise<void>;
  onDeferredStartupError: (error: unknown) => void;
  cleanup: () => Promise<void>;
}): Promise<void> {
  let startupTask: Promise<void> | null = null;
  try {
    const runtimePoolTask = params.runtimePool.run();
    startupTask = params.startDeferredStartup();
    void startupTask.catch(params.onDeferredStartupError);
    await runtimePoolTask;
  } finally {
    if (startupTask) {
      await startupTask.catch(() => undefined);
    }
    await params.cleanup();
  }
}
