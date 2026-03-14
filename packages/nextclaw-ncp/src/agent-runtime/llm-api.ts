export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type OpenAIChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | OpenAIContentPart[] }
  | {
      role: "assistant";
      content?: string | null;
      tool_calls?: OpenAIToolCall[];
    }
  | { role: "tool"; content: string; tool_call_id: string };

export type OpenAITool = {
  type: "function";
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

export type OpenAIToolCallDelta = {
  index?: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

export type OpenAIChatChunk = {
  id?: string;
  choices?: Array<{
    index?: number;
    delta?: {
      content?: string | null;
      tool_calls?: OpenAIToolCallDelta[];
      reasoning_content?: string;
      reasoning?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type NcpLLMApiInput = {
  messages: OpenAIChatMessage[];
  tools?: OpenAITool[];
  model?: string;
  max_tokens?: number;
};

export type NcpLLMApiOptions = {
  signal?: AbortSignal;
  temperature?: number;
};

export interface NcpLLMApi {
  generate(
    input: NcpLLMApiInput,
    options?: NcpLLMApiOptions,
  ): AsyncIterable<OpenAIChatChunk>;
}
