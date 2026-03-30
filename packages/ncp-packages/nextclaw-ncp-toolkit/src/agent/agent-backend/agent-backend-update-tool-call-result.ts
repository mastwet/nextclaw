import { NcpEventType, type NcpEndpointEvent, type NcpSessionSummary } from "@nextclaw/ncp";
import type { AgentLiveSessionRegistry } from "./agent-live-session-registry.js";
import type { EventPublisher } from "./event-publisher.js";

export async function updateAgentBackendToolCallResult(params: {
  sessionId: string;
  toolCallId: string;
  content: unknown;
  sessionRegistry: AgentLiveSessionRegistry;
  publisher: EventPublisher;
  persistSession: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<NcpSessionSummary | null>;
}): Promise<NcpSessionSummary | null> {
  const normalizedSessionId = params.sessionId.trim();
  const normalizedToolCallId = params.toolCallId.trim();
  if (!normalizedSessionId || !normalizedToolCallId) {
    return null;
  }

  const liveSession = await params.sessionRegistry.ensureSession(normalizedSessionId);
  const event: NcpEndpointEvent = {
    type: NcpEventType.MessageToolCallResult,
    payload: {
      sessionId: normalizedSessionId,
      toolCallId: normalizedToolCallId,
      content: params.content,
    },
  };

  await liveSession.stateManager.dispatch(event);
  params.publisher.publish(event);
  if (liveSession.activeExecution && !liveSession.activeExecution.closed) {
    liveSession.activeExecution.publisher.publish(event);
  }
  await params.persistSession(normalizedSessionId);
  return params.getSession(normalizedSessionId);
}
