import {
  type NcpAssistantReasoningNormalizationMode,
  type NcpAgentConversationStateManager,
  type NcpAgentRunInput,
  type NcpAgentRunOptions,
  type NcpAgentRuntime,
  type NcpContextBuilder,
  type NcpEncodeContext,
  type NcpEndpointEvent,
  type NcpLLMApi,
  type NcpLLMApiInput,
  type NcpToolCallResult,
  type NcpStreamEncoder,
  type NcpToolRegistry,
  type OpenAIChatChunk,
  isHiddenNcpMessage,
  NcpEventType,
} from "@nextclaw/ncp";
import { DefaultNcpStreamEncoder } from "./stream-encoder.js";
import {
  appendToolRoundToInput,
  createInvalidToolArgumentsResult,
  genId,
  parseToolArgs,
  validateToolArgs,
} from "./utils.js";
import { DefaultNcpRoundCollector } from "./round-collector.js";

export type DefaultNcpAgentRuntimeConfig = {
  contextBuilder: NcpContextBuilder;
  llmApi: NcpLLMApi;
  toolRegistry: NcpToolRegistry;
  stateManager: NcpAgentConversationStateManager;
  streamEncoder?: NcpStreamEncoder;
  reasoningNormalizationMode?: NcpAssistantReasoningNormalizationMode;
};

export class DefaultNcpAgentRuntime implements NcpAgentRuntime {
  private readonly contextBuilder: NcpContextBuilder;
  private readonly llmApi: NcpLLMApi;
  private readonly toolRegistry: NcpToolRegistry;
  private readonly stateManager: NcpAgentConversationStateManager;
  private readonly streamEncoder: NcpStreamEncoder;
  private readonly reasoningNormalizationMode: NcpAssistantReasoningNormalizationMode;

  constructor(config: DefaultNcpAgentRuntimeConfig) {
    this.contextBuilder = config.contextBuilder;
    this.llmApi = config.llmApi;
    this.toolRegistry = config.toolRegistry;
    this.stateManager = config.stateManager;
    this.reasoningNormalizationMode = config.reasoningNormalizationMode ?? "off";
    this.streamEncoder =
      config.streamEncoder ??
      new DefaultNcpStreamEncoder({
        reasoningNormalizationMode: this.reasoningNormalizationMode,
      });
  }

  run = async function* (
    this: DefaultNcpAgentRuntime,
    input: NcpAgentRunInput,
    options?: NcpAgentRunOptions,
  ): AsyncGenerator<NcpEndpointEvent> {
    const ctx: NcpEncodeContext = {
      messageId: genId(),
      runId: genId(),
      sessionId: input.sessionId,
      correlationId: input.correlationId,
    };

    const sessionMessages = this.stateManager.getSnapshot().messages;
    const modelInput = this.contextBuilder.prepare(input, {
      sessionMessages,
    });

    for (const msg of input.messages) {
      if (isHiddenNcpMessage(msg)) {
        continue;
      }
      const messageSent: NcpEndpointEvent = {
        type: NcpEventType.MessageSent,
        payload: { sessionId: input.sessionId, message: msg },
      };
      await this.stateManager.dispatch(messageSent);
    }

    const runStarted: NcpEndpointEvent = {
      type: NcpEventType.RunStarted,
      payload: { sessionId: ctx.sessionId, messageId: ctx.messageId, runId: ctx.runId },
    };
    await this.stateManager.dispatch(runStarted);
    yield runStarted;

    for await (const event of this.runLoop(modelInput, ctx, options)) {
      await this.stateManager.dispatch(event);
      yield event;
    }
  };

  /**
   * Agent loop: LLM stream → encoder events → tool execution (if any) → next round or finish.
   * RunFinished is emitted only when the entire loop completes (no more tool calls).
   * The stream encoder does not emit RunFinished; it only converts chunks to NCP events.
   */
  private async *runLoop(
    llmInput: NcpLLMApiInput,
    ctx: NcpEncodeContext,
    options?: NcpAgentRunOptions,
  ): AsyncGenerator<NcpEndpointEvent> {
    const roundCollector = new DefaultNcpRoundCollector(this.reasoningNormalizationMode);
    let currentInput = llmInput;
    let done = false;

    while (!done && !options?.signal?.aborted) {
      roundCollector.clear();

      const stream = this.llmApi.generate(currentInput, { signal: options?.signal });
      const tappedStream = this.tapStream(stream, (chunk) => roundCollector.consumeChunk(chunk));

      for await (const event of this.streamEncoder.encode(tappedStream, ctx)) {
        yield event;
      }

      const toolResults: NcpToolCallResult[] = [];
      for (const toolCall of roundCollector.getToolCalls()) {
        const tool = this.toolRegistry.getTool(toolCall.toolName);
        const parsedArgs = parseToolArgs(toolCall.args);
        let result: unknown;
        let args: Record<string, unknown> | null = null;

        if (!parsedArgs.ok) {
          result = createInvalidToolArgumentsResult({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            rawArgumentsText: parsedArgs.rawText,
            issues: parsedArgs.issues,
          });
        } else {
          const schemaIssues = validateToolArgs(parsedArgs.value, tool?.parameters);
          if (schemaIssues.length > 0) {
            result = createInvalidToolArgumentsResult({
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              rawArgumentsText: parsedArgs.rawText,
              issues: schemaIssues,
            });
          } else {
            args = parsedArgs.value;
            result = await this.toolRegistry.execute(
              toolCall.toolCallId,
              toolCall.toolName,
              parsedArgs.value,
            );
          }
        }

        toolResults.push({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args,
          rawArgsText: parsedArgs.rawText,
          result,
        });
        yield {
          type: NcpEventType.MessageToolCallResult,
          payload: {
            sessionId: ctx.sessionId,
            toolCallId: toolCall.toolCallId,
            content: result,
          },
        };
      }

      if (toolResults.length === 0) {
        yield {
          type: NcpEventType.RunFinished,
          payload: { sessionId: ctx.sessionId, messageId: ctx.messageId, runId: ctx.runId },
        };
        done = true;
        break;
      }

      currentInput = appendToolRoundToInput(
        currentInput,
        roundCollector.getReasoning(),
        roundCollector.getText(),
        toolResults,
      );
    }
  }

  private async *tapStream(
    stream: AsyncIterable<OpenAIChatChunk>,
    onChunk: (chunk: OpenAIChatChunk) => void,
  ): AsyncGenerator<OpenAIChatChunk> {
    for await (const chunk of stream) {
      onChunk(chunk);
      yield chunk;
    }
  }
}
