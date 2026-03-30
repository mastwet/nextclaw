import type { DefaultNcpAgentBackend } from "@nextclaw/ncp-toolkit";
import { buildSubagentCompletionFollowUpMessage } from "./ncp-subagent-completion-message.js";

type SubagentCompletion = {
  sessionId: string;
  runId: string;
  toolCallId?: string;
  label: string;
  task: string;
  result: string;
  status: "ok" | "error";
};

async function consumeAgentRun(events: AsyncIterable<unknown>): Promise<void> {
  for await (const _event of events) {
    void _event;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSessionToBecomeIdle(params: {
  backend: Pick<DefaultNcpAgentBackend, "getSession">;
  sessionId: string;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<boolean> {
  const timeoutMs = params.timeoutMs ?? 15000;
  const intervalMs = params.intervalMs ?? 150;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const summary = await params.backend.getSession(params.sessionId);
    if (!summary) {
      return false;
    }
    if (summary.status !== "running") {
      return true;
    }
    await sleep(intervalMs);
  }

  return false;
}

export async function persistSubagentCompletionAndResumeParent(params: {
  backend: Pick<DefaultNcpAgentBackend, "getSession" | "send" | "updateToolCallResult">;
  completion: SubagentCompletion;
}): Promise<void> {
  const isIdle = await waitForSessionToBecomeIdle({
    backend: params.backend,
    sessionId: params.completion.sessionId,
  });
  if (!isIdle) {
    return;
  }

  if (params.completion.toolCallId?.trim()) {
    await params.backend.updateToolCallResult(
      params.completion.sessionId,
      params.completion.toolCallId.trim(),
      {
        kind: "nextclaw.subagent_run",
        runId: params.completion.runId,
        label: params.completion.label,
        task: params.completion.task,
        status: params.completion.status === "ok" ? "completed" : "failed",
        result: params.completion.result,
      },
    );
  }

  await consumeAgentRun(
    params.backend.send({
      sessionId: params.completion.sessionId,
      message: buildSubagentCompletionFollowUpMessage(params.completion),
    }),
  );
}
