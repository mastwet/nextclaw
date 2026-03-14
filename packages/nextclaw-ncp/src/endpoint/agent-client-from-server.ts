import {
  type NcpMessageAbortPayload,
  type NcpRequestEnvelope,
  type NcpResumeRequestPayload,
  NcpEventType,
} from "../types/events.js";
import type { NcpAgentClientEndpoint } from "./agent-client-endpoint.js";
import type { NcpAgentServerEndpoint } from "./agent-server-endpoint.js";

/**
 * Creates an NcpAgentClientEndpoint that forwards to an in-process NcpAgentServerEndpoint.
 * Use when the agent runs in-process and you need to pass a client endpoint to the HTTP server.
 */
export function createAgentClientFromServer(
  server: NcpAgentServerEndpoint,
): NcpAgentClientEndpoint {
  return {
    ...server,
    async send(envelope: NcpRequestEnvelope): Promise<void> {
      await server.emit({ type: NcpEventType.MessageRequest, payload: envelope });
    },
    async resume(payload: NcpResumeRequestPayload): Promise<void> {
      await server.emit({ type: NcpEventType.MessageResumeRequest, payload });
    },
    async abort(payload?: NcpMessageAbortPayload): Promise<void> {
      await server.emit({ type: NcpEventType.MessageAbort, payload: payload ?? {} });
    },
  };
}
