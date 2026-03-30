import {
  stringifyUnknown,
  summarizeToolArgs,
  type ToolCard,
} from "@/lib/chat-message";
import type { ChatToolPartViewModel } from "@nextclaw/agent-chat-ui";

type ToolCardViewSource = ToolCard & {
  statusTone: ChatToolPartViewModel["statusTone"];
  statusLabel: string;
};

type SpawnToolInvocation = {
  toolName: string;
  toolCallId?: string;
  args?: unknown;
  result?: unknown;
};

type SubagentToolCardTexts = {
  toolStatusRunningLabel: string;
  toolStatusCompletedLabel: string;
  toolStatusFailedLabel: string;
};

type SubagentRunResult = {
  runId?: string;
  label?: string;
  task?: string;
  status?: string;
  result?: unknown;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSubagentRunResult(value: unknown): SubagentRunResult | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.kind === "nextclaw.subagent_run") {
    return value;
  }
  if (typeof value.runId === "string" && typeof value.status === "string") {
    return value;
  }
  return null;
}

export function buildSubagentToolCard(params: {
  invocation: SpawnToolInvocation;
  texts: SubagentToolCardTexts;
}): ToolCardViewSource | null {
  if (params.invocation.toolName !== "spawn") {
    return null;
  }

  const subagentRun = readSubagentRunResult(params.invocation.result);
  if (!subagentRun) {
    return null;
  }

  const detailParts = [
    readOptionalString(subagentRun.label)
      ? `label: ${subagentRun.label?.trim()}`
      : null,
    readOptionalString(subagentRun.task)
      ? `task: ${subagentRun.task?.trim()}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const normalizedStatus = readOptionalString(subagentRun.status)?.toLowerCase();
  const output =
    (typeof subagentRun.result !== "undefined"
      ? stringifyUnknown(subagentRun.result).trim()
      : "") ||
    readOptionalString(subagentRun.message) ||
    undefined;

  if (normalizedStatus === "failed") {
    return {
      kind: "result",
      name: params.invocation.toolName,
      detail: detailParts.join(" · ") || summarizeToolArgs(params.invocation.args),
      text: output,
      callId: params.invocation.toolCallId || undefined,
      hasResult: Boolean(output),
      statusTone: "error",
      statusLabel: params.texts.toolStatusFailedLabel,
    };
  }

  if (normalizedStatus === "completed") {
    return {
      kind: "result",
      name: params.invocation.toolName,
      detail: detailParts.join(" · ") || summarizeToolArgs(params.invocation.args),
      text: output,
      callId: params.invocation.toolCallId || undefined,
      hasResult: Boolean(output),
      statusTone: "success",
      statusLabel: params.texts.toolStatusCompletedLabel,
    };
  }

  return {
    kind: "result",
    name: params.invocation.toolName,
    detail: detailParts.join(" · ") || summarizeToolArgs(params.invocation.args),
    text: output,
    callId: params.invocation.toolCallId || undefined,
    hasResult: Boolean(output),
    statusTone: "running",
    statusLabel: params.texts.toolStatusRunningLabel,
  };
}
