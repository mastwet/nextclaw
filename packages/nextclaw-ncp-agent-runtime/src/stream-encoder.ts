import {
  type NcpEncodeContext,
  type NcpEndpointEvent,
  type NcpStreamEncoder,
  type OpenAIChatChunk,
  NcpEventType,
} from "@nextclaw/ncp";
import { type DeltaLike, type ToolCallBuffer, emitReasoningDelta, emitTextDeltas, emitToolCallDeltas, flushToolCalls } from "./stream-encoder.utils.js";

/**
 * Converts LLM stream chunks to NCP events (text, reasoning, tool calls).
 * Does not emit RunFinished; that is the runtime's responsibility after the loop completes.
 */
export class DefaultNcpStreamEncoder implements NcpStreamEncoder {
  encode = async function* (
    stream: AsyncIterable<OpenAIChatChunk>,
    context: NcpEncodeContext,
  ): AsyncGenerator<NcpEndpointEvent> {
    const { sessionId, messageId } = context;
    let state = { textStarted: false };
    const toolCallBuffers = new Map<number, ToolCallBuffer>();

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta as DeltaLike | undefined;
      if (delta) {
        const nextState = yield* emitTextDeltas(delta, { sessionId, messageId }, state);
        state = nextState;
        yield* emitReasoningDelta(delta, { sessionId, messageId });
        yield* emitToolCallDeltas(delta, toolCallBuffers, sessionId);
      }

      const finishReason = choice.finish_reason;
      if (typeof finishReason === "string" && finishReason.trim().length > 0) {
        yield* flushToolCalls(toolCallBuffers, sessionId);
        if (state.textStarted) {
          yield { type: NcpEventType.MessageTextEnd, payload: { sessionId, messageId } };
        }
      }
    }
  };
}
