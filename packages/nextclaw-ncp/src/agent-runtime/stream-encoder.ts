import type { NcpEndpointEvent } from "../types/events.js";
import type { OpenAIChatChunk } from "./llm-api.js";

export type NcpEncodeContext = {
  sessionId: string;
  messageId: string;
  runId: string;
  correlationId?: string;
};

export interface NcpStreamEncoder {
  encode(
    stream: AsyncIterable<OpenAIChatChunk>,
    context: NcpEncodeContext,
  ): AsyncIterable<NcpEndpointEvent>;
}
