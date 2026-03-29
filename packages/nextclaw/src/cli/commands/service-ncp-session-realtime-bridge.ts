import type { SessionManager } from "@nextclaw/core";
import type { NcpSessionApi } from "@nextclaw/ncp";
import type { UiServerEvent } from "@nextclaw/server";
import { createNcpSessionRealtimeChangePublisher } from "./ncp/ncp-session-realtime-change.js";
import { UiSessionService } from "./ncp/ui-session-service.js";
import {
  createDeferredUiNcpSessionService,
  type DeferredUiNcpSessionServiceController
} from "./service-deferred-ncp-session-service.js";

type PublishUiEvent = ((event: UiServerEvent) => void) | undefined;

export type ServiceNcpSessionRealtimeBridge = {
  sessionService: NcpSessionApi;
  deferredSessionService: DeferredUiNcpSessionServiceController;
  publishSessionChange: (sessionKey: string) => Promise<void>;
  setUiEventPublisher: (publishUiEvent: PublishUiEvent) => void;
  clear: () => void;
};

export function createServiceNcpSessionRealtimeBridge(params: {
  sessionManager: SessionManager;
  publishUiEvent?: PublishUiEvent;
}): ServiceNcpSessionRealtimeBridge {
  let publishUiEvent = params.publishUiEvent;
  let publishSessionChange = async (_sessionKey: string): Promise<void> => {};

  const persistedSessionService = new UiSessionService(params.sessionManager, {
    onSessionUpdated: (sessionKey) => {
      void publishSessionChange(sessionKey);
    }
  });
  const deferredSessionService = createDeferredUiNcpSessionService(persistedSessionService);

  publishSessionChange = async (sessionKey: string) => {
    await createNcpSessionRealtimeChangePublisher({
      sessionApi: deferredSessionService.service,
      publishUiEvent
    }).publishSessionChange(sessionKey);
  };

  return {
    sessionService: deferredSessionService.service,
    deferredSessionService,
    publishSessionChange,
    setUiEventPublisher(nextPublishUiEvent) {
      publishUiEvent = nextPublishUiEvent;
    },
    clear() {
      deferredSessionService.clear();
    }
  };
}
