import { describe, expect, it } from "vitest";
import type { NcpMessage } from "@nextclaw/ncp";
import { DefaultNcpAgentConversationStateManager } from "./agent-conversation-state-manager.js";

const now = "2026-03-12T00:00:00.000Z";

const createMessage = (overrides: Partial<NcpMessage> = {}): NcpMessage => {
  return {
    id: "msg-1",
    sessionKey: "session-1",
    role: "assistant",
    status: "final",
    parts: [],
    timestamp: now,
    ...overrides,
  };
};

describe("DefaultNcpAgentConversationStateManager streaming", () => {
  it("aggregates text streaming events and finalizes on message.completed", () => {
    const manager = new DefaultNcpAgentConversationStateManager();

    manager.dispatch({
      type: "message.text-start",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-1",
      },
    });
    manager.dispatch({
      type: "message.text-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-1",
        delta: "hello ",
      },
    });
    manager.dispatch({
      type: "message.text-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-1",
        delta: "world",
      },
    });
    manager.dispatch({
      type: "message.text-end",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-1",
      },
    });

    const midSnapshot = manager.getSnapshot();
    expect(midSnapshot.streamingMessage?.status).toBe("pending");
    expect(midSnapshot.streamingMessage?.parts).toEqual([{ type: "text", text: "hello world" }]);

    manager.dispatch({
      type: "message.completed",
      payload: {
        sessionKey: "session-1",
        message: createMessage({
          id: "assistant-1",
          status: "final",
          parts: [{ type: "text", text: "hello world" }],
          role: "assistant",
        }),
      },
    });

    const snapshot = manager.getSnapshot();
    expect(snapshot.streamingMessage).toBeNull();
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0]?.id).toBe("assistant-1");
    expect(snapshot.messages[0]?.status).toBe("final");
  });

  it("handles reasoning and tool-call lifecycle on one streaming message", () => {
    const manager = new DefaultNcpAgentConversationStateManager();

    manager.dispatch({
      type: "message.reasoning-start",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
      },
    });
    manager.dispatch({
      type: "message.reasoning-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
        delta: "thinking ",
      },
    });
    manager.dispatch({
      type: "message.reasoning-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
        delta: "hard",
      },
    });

    manager.dispatch({
      type: "message.tool-call-start",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
        toolCallId: "tool-1",
        toolName: "search",
      },
    });
    manager.dispatch({
      type: "message.tool-call-args-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
        toolCallId: "tool-1",
        delta: "{\"q\":\"hel",
      },
    });
    manager.dispatch({
      type: "message.tool-call-args-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-2",
        toolCallId: "tool-1",
        delta: "lo\"}",
      },
    });
    manager.dispatch({
      type: "message.tool-call-end",
      payload: {
        sessionKey: "session-1",
        toolCallId: "tool-1",
      },
    });
    manager.dispatch({
      type: "message.tool-call-result",
      payload: {
        sessionKey: "session-1",
        toolCallId: "tool-1",
        content: { ok: true },
      },
    });

    const snapshot = manager.getSnapshot();
    const streaming = snapshot.streamingMessage;
    expect(streaming?.id).toBe("assistant-2");
    expect(streaming?.parts[0]).toEqual({ type: "reasoning", text: "thinking hard" });
    expect(streaming?.parts[1]).toEqual({
      type: "tool-invocation",
      toolCallId: "tool-1",
      toolName: "search",
      state: "result",
      args: "{\"q\":\"hello\"}",
      result: { ok: true },
    });
  });

});

describe("DefaultNcpAgentConversationStateManager error and notify", () => {
  it("marks streaming message as error on message.failed", () => {
    const manager = new DefaultNcpAgentConversationStateManager();

    manager.dispatch({
      type: "message.text-start",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-3",
      },
    });
    manager.dispatch({
      type: "message.text-delta",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-3",
        delta: "partial",
      },
    });
    manager.dispatch({
      type: "message.failed",
      payload: {
        sessionKey: "session-1",
        messageId: "assistant-3",
        error: {
          code: "runtime-error",
          message: "failed",
        },
      },
    });

    const snapshot = manager.getSnapshot();
    expect(snapshot.streamingMessage).toBeNull();
    expect(snapshot.error?.message).toBe("failed");
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0]?.status).toBe("error");
  });

  it("keeps subscriber silent on non-mutating message.accepted", () => {
    const manager = new DefaultNcpAgentConversationStateManager();
    let callbackCount = 0;

    manager.subscribe(() => {
      callbackCount += 1;
    });

    manager.dispatch({
      type: "message.accepted",
      payload: {
        messageId: "assistant-0",
      },
    });

    expect(callbackCount).toBe(0);

    manager.dispatch({
      type: "message.sent",
      payload: {
        sessionKey: "session-1",
        message: createMessage({
          id: "user-1",
          role: "user",
          status: "final",
          parts: [{ type: "text", text: "ping" }],
        }),
      },
    });

    expect(callbackCount).toBe(1);
  });

  it("maps run.error to runtime-error and allows endpoint.error override", () => {
    const manager = new DefaultNcpAgentConversationStateManager();

    manager.dispatch({
      type: "run.error",
      payload: {},
    });
    expect(manager.getSnapshot().error).toMatchObject({
      code: "runtime-error",
      message: "Agent run failed.",
    });

    manager.dispatch({
      type: "endpoint.error",
      payload: {
        code: "auth-error",
        message: "missing token",
      },
    });
    expect(manager.getSnapshot().error).toMatchObject({
      code: "auth-error",
      message: "missing token",
    });
  });
});
