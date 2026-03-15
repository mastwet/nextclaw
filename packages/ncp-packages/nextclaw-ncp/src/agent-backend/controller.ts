import type {
  NcpEndpointEvent,
  NcpMessageAbortPayload,
  NcpRequestEnvelope,
  NcpStreamRequestPayload,
} from "../types/events.js";
import type { NcpSessionApi } from "../types/session.js";

export type NcpAgentBackendSendOptions = {
  signal?: AbortSignal;
};

export type NcpAgentBackendStreamOptions = {
  signal?: AbortSignal;
};

export interface NcpAgentBackendController extends NcpSessionApi {
  send(
    envelope: NcpRequestEnvelope,
    options?: NcpAgentBackendSendOptions,
  ): AsyncIterable<NcpEndpointEvent>;

  stream(
    payload: NcpStreamRequestPayload,
    options?: NcpAgentBackendStreamOptions,
  ): AsyncIterable<NcpEndpointEvent>;

  abort(payload: NcpMessageAbortPayload): Promise<void>;
}

export type NcpAgentStreamProvider = {
  stream(params: {
    payload: NcpStreamRequestPayload;
    signal: AbortSignal;
  }): AsyncIterable<NcpEndpointEvent>;
};
