import type { OutboundMessage } from "../../bus/events.js";
import { Tool } from "./base.js";

export class MessageTool extends Tool {
  private channel = "cli";
  private chatId = "direct";
  private accountId?: string;

  constructor(private sendCallback: (msg: OutboundMessage) => Promise<void>) {
    super();
  }

  get name(): string {
    return "message";
  }

  get description(): string {
    return "Send a message to a chat channel";
  }

  get parameters(): Record<string, unknown> {
    return {
      type: "object",
      properties: {
        action: { type: "string", enum: ["send"], description: "Action to perform" },
        content: { type: "string", description: "Message to send" },
        message: { type: "string", description: "Alias for content" },
        channel: { type: "string", description: "Channel name" },
        chatId: { type: "string", description: "Chat ID" },
        to: { type: "string", description: "Alias for chatId" },
        accountId: { type: "string", description: "Account ID for multi-account channels" },
        replyTo: { type: "string", description: "Message ID to reply to" },
        silent: { type: "boolean", description: "Send without notification where supported" }
      },
      required: []
    };
  }

  setContext(channel: string, chatId: string, accountId?: string | null): void {
    this.channel = channel;
    this.chatId = chatId;
    this.accountId = typeof accountId === "string" && accountId.trim().length > 0 ? accountId : undefined;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const action = params.action ? String(params.action) : "send";
    if (action !== "send") {
      return `Error: Unsupported action '${action}'`;
    }
    const content = String(params.content ?? params.message ?? "");
    if (!content) {
      return "Error: content/message is required";
    }
    const channel = String(params.channel ?? this.channel);
    const chatId = String(params.chatId ?? params.to ?? this.chatId);
    const accountId =
      typeof params.accountId === "string" && params.accountId.trim().length > 0 ? params.accountId : this.accountId;
    const replyTo = params.replyTo ? String(params.replyTo) : undefined;
    const silent = typeof params.silent === "boolean" ? params.silent : undefined;
    const metadata: Record<string, unknown> = {};
    if (silent !== undefined) {
      metadata.silent = silent;
    }
    if (accountId) {
      metadata.accountId = accountId;
      metadata.account_id = accountId;
    }
    await this.sendCallback({
      channel,
      chatId,
      content,
      replyTo,
      media: [],
      metadata
    });
    return `Message sent to ${channel}:${chatId}`;
  }
}
