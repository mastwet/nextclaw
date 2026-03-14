import type { NcpToolCallResult } from "./tool.js";

export type NcpPendingToolCall = {
  toolCallId: string;
  toolName: string;
  args: unknown;
};

export interface NcpRoundBuffer {
  appendText(delta: string): void;
  getText(): string;
  appendToolCall(result: NcpToolCallResult): void;
  getToolCalls(): ReadonlyArray<NcpToolCallResult>;
  startToolCall(toolCallId: string, toolName: string): void;
  appendToolCallArgs(args: unknown): void;
  consumePendingToolCall(): NcpPendingToolCall | null;
  clear(): void;
}
