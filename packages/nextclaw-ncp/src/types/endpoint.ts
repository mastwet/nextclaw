import type { NcpError } from "./errors.js";
import type { NcpEndpointManifest } from "./manifest.js";
import type { NcpMessage } from "./message.js";

// ---------------------------------------------------------------------------
// Message envelopes
// ---------------------------------------------------------------------------

/**
 * Envelope for a message.request event (one peer → the other).
 * When `correlationId` is set, the responder should echo it on
 * message.completed / message.failed so the initiator can correlate.
 */
export type NcpRequestEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  /** Optional caller-assigned id for correlating this request with its response. */
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Envelope for message.received (partial or full message from the other peer).
 * Mirrors NcpRequestEnvelope shape for symmetric request/response.
 */
export type NcpResponseEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  /** Echoed from the originating `NcpRequestEnvelope.correlationId`, if present. */
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Which part of the message this delta belongs to.
 * Omit or use "text" for main assistant text; "reasoning" for reasoning block;
 * "tool-args" for streaming tool call arguments (must set toolCallId).
 */
export type NcpDeltaPartKind = "text" | "reasoning" | "tool-args";

/**
 * Fine-grained streaming delta for use in UIs and streaming transports.
 * Emitted repeatedly between message.received and message.completed.
 * When partKind is omitted, treat as "text". When partKind is "tool-args", toolCallId is required.
 */
export type NcpDeltaEnvelope = {
  sessionKey: string;
  messageId: string;
  /** Incremental fragment — append in order to the part indicated by partKind/toolCallId. */
  delta: string;
  /** Default "text". Use "reasoning" for reasoning block; "tool-args" for tool invocation args (set toolCallId). */
  partKind?: NcpDeltaPartKind;
  /** Required when partKind is "tool-args"; identifies which tool-invocation part to append to. */
  toolCallId?: string;
  metadata?: Record<string, unknown>;
};

/** Final message payload delivered on successful completion of a turn. */
export type NcpCompletedEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  /** Echoed from the originating `NcpRequestEnvelope.correlationId`, if present. */
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

/** Error payload delivered when a turn fails before or after streaming begins. */
export type NcpFailedEnvelope = {
  sessionKey: string;
  /** Present when the failure is associated with a specific in-progress message. */
  messageId?: string;
  error: NcpError;
  /** Echoed from the originating `NcpRequestEnvelope.correlationId`, if present. */
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

/** Payload for message.accepted — acknowledges receipt of a request. */
export type NcpMessageAcceptedPayload = {
  messageId: string;
  correlationId?: string;
  transportId?: string;
};

/** Payload for message.abort — request cancellation of an in-flight message. */
export type NcpMessageAbortPayload = {
  messageId?: string;
  correlationId?: string;
};

// ---------------------------------------------------------------------------
// Endpoint event bus (unified: request/response/stream/abort/ lifecycle)
// ---------------------------------------------------------------------------

/**
 * All events on the endpoint: either peer may emit these; subscribers receive via `subscribe()`.
 * Events are ordered within a session but not guaranteed across sessions.
 */
export type NcpEndpointEvent =
  | { type: "endpoint.ready" }
  | { type: "message.request"; payload: NcpRequestEnvelope }
  | { type: "message.accepted"; payload: NcpMessageAcceptedPayload }
  | { type: "message.received"; payload: NcpResponseEnvelope }
  | { type: "message.delta"; payload: NcpDeltaEnvelope }
  | { type: "message.completed"; payload: NcpCompletedEnvelope }
  | { type: "message.failed"; payload: NcpFailedEnvelope }
  | { type: "message.abort"; payload: NcpMessageAbortPayload }
  | { type: "endpoint.error"; payload: NcpError };

/** Callback signature for `NcpEndpoint.subscribe`. */
export type NcpEndpointSubscriber = (event: NcpEndpointEvent) => void;

// ---------------------------------------------------------------------------
// Endpoint contract
// ---------------------------------------------------------------------------

/**
 * Core interface every NCP endpoint adapter must implement.
 *
 * Single primitive: emit(event) to send, subscribe(listener) to receive.
 * Request/response/stream are all event types (e.g. message.request, message.accepted, message.delta).
 */
export interface NcpEndpoint {
  readonly manifest: NcpEndpointManifest;

  start(): Promise<void>;
  stop(): Promise<void>;

  /** Emit an event to the other peer(s). Subscribers receive it via subscribe(). */
  emit(event: NcpEndpointEvent): void | Promise<void>;

  /** Subscribe to events. Returns unsubscribe function. */
  subscribe(listener: NcpEndpointSubscriber): () => void;
}
