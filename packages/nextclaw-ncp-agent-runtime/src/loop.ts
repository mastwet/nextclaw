import {
  type NcpAgentRunOptions,
  type NcpEncodeContext,
  type NcpEndpointEvent,
  type NcpLLMApi,
  type NcpLLMApiInput,
  type NcpRoundBuffer,
  type NcpStreamEncoder,
  type NcpToolRegistry,
  type NcpMessagePart,
  type OpenAIChatMessage,
  NcpEventType,
} from "@nextclaw/ncp";
import { DefaultNcpRoundBuffer } from "./round-buffer.js";

function parseToolArgs(args: unknown): unknown {
  if (typeof args === "string") {
    try {
      return JSON.parse(args) as unknown;
    } catch {
      return args;
    }
  }
  return args;
}

export class DefaultNcpAgentLoop {
  run = async function* (
    llmInput: NcpLLMApiInput,
    llmApi: NcpLLMApi,
    encoder: NcpStreamEncoder,
    toolRegistry: NcpToolRegistry,
    ctx: NcpEncodeContext,
    options?: NcpAgentRunOptions,
  ): AsyncGenerator<NcpEndpointEvent> {
    const roundBuffer: NcpRoundBuffer = new DefaultNcpRoundBuffer();
    let currentInput = llmInput;
    let done = false;

    while (!done && !options?.signal?.aborted) {
      roundBuffer.clear();

      const stream = llmApi.generate(currentInput, { signal: options?.signal });

      for await (const event of encoder.encode(stream, ctx)) {
        switch (event.type) {
          case NcpEventType.MessageToolCallStart:
            roundBuffer.startToolCall(event.payload.toolCallId, event.payload.toolName);
            break;
          case NcpEventType.MessageToolCallArgs:
            roundBuffer.appendToolCallArgs(event.payload.args);
            break;
          case NcpEventType.MessageToolCallEnd: {
            const pending = roundBuffer.consumePendingToolCall();
            if (pending) {
              const parsedArgs = parseToolArgs(pending.args);
              const result = await toolRegistry.execute(
                pending.toolCallId,
                pending.toolName,
                parsedArgs,
              );
              roundBuffer.appendToolCall({
                toolCallId: pending.toolCallId,
                toolName: pending.toolName,
                args: parsedArgs,
                result,
              });
              yield {
                type: NcpEventType.MessageToolCallResult,
                payload: {
                  sessionId: ctx.sessionId,
                  toolCallId: pending.toolCallId,
                  content: result,
                },
              };
            }
            break;
          }
          case NcpEventType.MessageTextDelta:
            roundBuffer.appendText(event.payload.delta);
            break;
          case NcpEventType.RunFinished: {
            const text = roundBuffer.getText();
            const toolCalls = roundBuffer.getToolCalls();
            if (text.length > 0 || toolCalls.length > 0) {
              const parts: NcpMessagePart[] = [];
              if (text.length > 0) {
                parts.push({ type: "text", text });
              }
              for (const tr of toolCalls) {
                parts.push({
                  type: "tool-invocation",
                  toolCallId: tr.toolCallId,
                  toolName: tr.toolName,
                  state: "result",
                  args: tr.args,
                  result: tr.result,
                });
              }
              yield {
                type: NcpEventType.MessageCompleted,
                payload: {
                  sessionId: ctx.sessionId,
                  message: {
                    id: ctx.messageId,
                    sessionId: ctx.sessionId,
                    role: "assistant" as const,
                    status: "final" as const,
                    parts,
                    timestamp: new Date().toISOString(),
                  },
                },
              };
            }
            yield event;
            done = true;
            break;
          }
          default:
            break;
        }
        if (!done) yield event;
        if (done) break;
      }

      if (done) break;

      const toolResults = roundBuffer.getToolCalls();
      if (toolResults.length === 0) break;

      const text = roundBuffer.getText();
      const nextMessages: OpenAIChatMessage[] = [
        ...currentInput.messages,
        {
          role: "assistant" as const,
          content: text || null,
          tool_calls: toolResults.map((tr) => ({
            id: tr.toolCallId,
            type: "function" as const,
            function: {
              name: tr.toolName,
              arguments:
                typeof tr.args === "string" ? tr.args : JSON.stringify(tr.args ?? {}),
            },
          })),
        },
        ...toolResults.map((tr) => ({
          role: "tool" as const,
          content:
            typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result ?? {}),
          tool_call_id: tr.toolCallId,
        })),
      ];
      currentInput = { ...currentInput, messages: nextMessages };
    }
  };
}
