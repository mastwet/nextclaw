import { ToolInvocationStatus, type UiMessage } from "@nextclaw/agent-chat";
import { adaptChatMessages } from "@/components/chat/adapters/chat-message.adapter";
import type { ChatMessageSource } from "@/components/chat/adapters/chat-message.adapter";

function toSource(uiMessages: UiMessage[]): ChatMessageSource[] {
  return uiMessages as unknown as ChatMessageSource[];
}

const defaultTexts = {
  roleLabels: {
    user: "You",
    assistant: "Assistant",
    tool: "Tool",
    system: "System",
    fallback: "Message",
  },
  reasoningLabel: "Reasoning",
  toolCallLabel: "Tool Call",
  toolResultLabel: "Tool Result",
  toolNoOutputLabel: "No output",
  toolOutputLabel: "View Output",
  imageAttachmentLabel: "Image attachment",
  fileAttachmentLabel: "File attachment",
  unknownPartLabel: "Unknown Part",
};

function adapt(uiMessages: ChatMessageSource[]) {
  return adaptChatMessages({
    uiMessages,
    formatTimestamp: (value) => `formatted:${value}`,
    texts: defaultTexts,
  });
}

it("maps markdown, reasoning, and tool parts into UI view models", () => {
  const messages: UiMessage[] = [
    {
      id: "assistant-1",
      role: "assistant",
      meta: {
        status: "final",
        timestamp: "2026-03-17T10:00:00.000Z",
      },
      parts: [
        { type: "text", text: "hello world" },
        {
          type: "reasoning",
          reasoning: "internal reasoning",
          details: [],
        },
        {
          type: "tool-invocation",
          toolInvocation: {
            status: ToolInvocationStatus.RESULT,
            toolCallId: "call-1",
            toolName: "web_search",
            args: '{"q":"hello"}',
            result: { ok: true },
          },
        },
      ],
    },
  ];

  const adapted = adapt(toSource(messages));

  expect(adapted).toHaveLength(1);
  expect(adapted[0]?.roleLabel).toBe("Assistant");
  expect(adapted[0]?.timestampLabel).toBe(
    "formatted:2026-03-17T10:00:00.000Z",
  );
  expect(adapted[0]?.parts.map((part) => part.type)).toEqual([
    "markdown",
    "reasoning",
    "tool-card",
  ]);
  expect(adapted[0]?.parts[1]).toMatchObject({
    type: "reasoning",
    label: "Reasoning",
    text: "internal reasoning",
  });
  expect(adapted[0]?.parts[2]).toMatchObject({
    type: "tool-card",
    card: {
      titleLabel: "Tool Result",
      outputLabel: "View Output",
    },
  });
});

it("maps non-standard roles back to the generic message role", () => {
  const adapted = adapt([
    {
      id: "data-1",
      role: "data",
      parts: [{ type: "text", text: "payload" }],
    },
  ] as unknown as ChatMessageSource[]);

  expect(adapted[0]?.role).toBe("message");
  expect(adapted[0]?.roleLabel).toBe("Message");
});

it("maps unknown parts into a visible fallback part", () => {
  const adapted = adapt([
    {
      id: "x-1",
      role: "assistant",
      parts: [{ type: "step-start", value: "x" }],
    },
  ] as unknown as ChatMessageSource[]);

  expect(adapted[0]?.parts[0]).toMatchObject({
    type: "unknown",
    rawType: "step-start",
    label: "Unknown Part",
  });
});

it("drops empty and zero-width text parts during adaptation", () => {
  const adapted = adapt([
    {
      id: "assistant-mixed",
      role: "assistant",
      parts: [
        { type: "text", text: "   " },
        { type: "text", text: "\u200B\u200B" },
        { type: "text", text: "\u200Bhello\u200B" },
      ],
    },
  ] as unknown as ChatMessageSource[]);

  expect(adapted).toHaveLength(1);
  expect(adapted[0]?.id).toBe("assistant-mixed");
  expect(adapted[0]?.parts).toHaveLength(1);
  expect(adapted[0]?.parts[0]).toMatchObject({
    type: "markdown",
    text: "\u200Bhello\u200B",
  });
});

it("maps file parts into previewable attachment view models", () => {
  const adapted = adapt([
    {
      id: "assistant-file",
      role: "assistant",
      parts: [
        {
          type: "file",
          mimeType: "image/png",
          data: "ZmFrZS1pbWFnZQ==",
        },
      ],
    },
  ] as unknown as ChatMessageSource[]);

  expect(adapted[0]?.parts[0]).toEqual({
    type: "file",
    file: {
      label: "Image attachment",
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,ZmFrZS1pbWFnZQ==",
      isImage: true,
    },
  });
});

it("keeps named non-image files as downloadable attachments", () => {
  const adapted = adapt([
    {
      id: "assistant-doc",
      role: "assistant",
      parts: [
        {
          type: "file",
          name: "spec.pdf",
          mimeType: "application/pdf",
          data: "cGRm",
        },
      ],
    },
  ] as unknown as ChatMessageSource[]);

  expect(adapted[0]?.parts[0]).toEqual({
    type: "file",
    file: {
      label: "spec.pdf",
      mimeType: "application/pdf",
      dataUrl: "data:application/pdf;base64,cGRm",
      isImage: false,
    },
  });
});
