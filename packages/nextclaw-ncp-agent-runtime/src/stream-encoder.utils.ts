import type { NcpEndpointEvent } from "@nextclaw/ncp";
import { NcpEventType } from "@nextclaw/ncp";

export type ToolCallBuffer = {
  id?: string;
  name?: string;
  argumentsText: string;
  emittedStart?: boolean;
};

export type ToolCallDelta = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};

export type DeltaLike = {
  content?: string;
  reasoning_content?: string;
  reasoning?: string;
  tool_calls?: ToolCallDelta[];
};

export function getToolCallIndex(toolDelta: ToolCallDelta, fallback: number): number {
  const idx = toolDelta.index;
  return typeof idx === "number" && Number.isFinite(idx) ? idx : fallback;
}

export function applyToolDelta(current: ToolCallBuffer, toolDelta: ToolCallDelta): ToolCallBuffer {
  const next: ToolCallBuffer = { ...current, argumentsText: current.argumentsText };
  if (typeof toolDelta.id === "string" && toolDelta.id.trim()) {
    next.id = toolDelta.id;
  }
  const fn = toolDelta.function;
  if (fn && typeof fn === "object" && !Array.isArray(fn)) {
    if (typeof fn.name === "string" && fn.name.trim()) {
      next.name = fn.name.trim();
    }
    if (typeof fn.arguments === "string" && fn.arguments.length > 0) {
      next.argumentsText += fn.arguments;
    }
  }
  return next;
}

export function* emitTextDeltas(
  delta: DeltaLike,
  ctx: { sessionId: string; messageId: string },
  state: { textStarted: boolean },
): Generator<NcpEndpointEvent, { textStarted: boolean }> {
  const content = delta.content;
  if (typeof content !== "string" || content.length === 0) return state;

  if (!state.textStarted) {
    yield { type: NcpEventType.MessageTextStart, payload: ctx };
    yield { type: NcpEventType.MessageTextDelta, payload: { ...ctx, delta: content } };
    return { textStarted: true };
  }
  yield { type: NcpEventType.MessageTextDelta, payload: { ...ctx, delta: content } };
  return state;
}

export function* emitReasoningDelta(
  delta: DeltaLike,
  ctx: { sessionId: string; messageId: string },
): Generator<NcpEndpointEvent> {
  const reasoning = delta.reasoning_content ?? delta.reasoning;
  if (typeof reasoning !== "string" || !reasoning) return;

  yield { type: NcpEventType.MessageReasoningDelta, payload: { ...ctx, delta: reasoning } };
}

export function* emitToolCallDeltas(
  delta: DeltaLike,
  buffers: Map<number, ToolCallBuffer>,
  sessionId: string,
): Generator<NcpEndpointEvent> {
  const toolDeltas = delta.tool_calls;
  if (!Array.isArray(toolDeltas)) return;

  for (const toolDelta of toolDeltas) {
    const index = getToolCallIndex(toolDelta, buffers.size);
    const prev = buffers.get(index) ?? { argumentsText: "" };
    const current = applyToolDelta(prev, toolDelta);

    if (current.id && current.name && !current.emittedStart) {
      yield {
        type: NcpEventType.MessageToolCallStart,
        payload: { sessionId, toolCallId: current.id, toolName: current.name },
      };
      buffers.set(index, { ...current, emittedStart: true });
    } else {
      buffers.set(index, current);
    }
  }
}

export function* flushToolCalls(
  buffers: Map<number, ToolCallBuffer>,
  sessionId: string,
): Generator<NcpEndpointEvent> {
  const ordered = Array.from(buffers.entries()).sort(([a], [b]) => a - b);
  for (const [, buf] of ordered) {
    if (!buf.id || !buf.name) continue;
    yield {
      type: NcpEventType.MessageToolCallArgs,
      payload: { sessionId, toolCallId: buf.id, args: buf.argumentsText },
    };
    yield {
      type: NcpEventType.MessageToolCallEnd,
      payload: { sessionId, toolCallId: buf.id },
    };
  }
}
