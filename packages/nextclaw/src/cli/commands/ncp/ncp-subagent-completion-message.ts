import {
  NCP_INTERNAL_VISIBILITY_METADATA_KEY,
  type NcpMessage,
} from "@nextclaw/ncp";

export function buildSubagentCompletionFollowUpMessage(params: {
  sessionId: string;
  label: string;
  task: string;
  result: string;
  status: "ok" | "error";
}): NcpMessage {
  const timestamp = new Date().toISOString();
  const statusLabel = params.status === "ok" ? "completed" : "failed";
  return {
    id: `${params.sessionId}:system:subagent-follow-up:${timestamp}`,
    sessionId: params.sessionId,
    role: "system",
    status: "final",
    timestamp,
    parts: [
      {
        type: "text",
        text: [
          `[SYSTEM EVENT: SUBAGENT_${params.status === "ok" ? "COMPLETED" : "FAILED"}]`,
          "This is not a new user message.",
          "A subagent that you previously spawned for this same conversation has just finished.",
          `Subagent label: ${params.label}`,
          `Delegated task: ${params.task}`,
          `Subagent outcome: ${statusLabel}`,
          `Subagent result: ${params.result}`,
          "Your job now is to continue the parent task using this subagent result.",
          "If the user's request is now complete, answer the user directly.",
          "If more work is still needed, continue reasoning and use tools.",
          "Do not say that you received a hidden system event unless the user explicitly asks about internal behavior.",
        ].join("\n\n"),
      },
    ],
    metadata: {
      [NCP_INTERNAL_VISIBILITY_METADATA_KEY]: "hidden",
      system_event_kind: "subagent_completion_follow_up",
      subagent_label: params.label,
      subagent_status: params.status,
      subagent_task: params.task,
    },
  };
}
