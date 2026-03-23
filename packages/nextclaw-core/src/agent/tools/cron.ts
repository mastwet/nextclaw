import { Tool } from "./base.js";
import type { CronService } from "../../cron/service.js";
import type { CronSchedule } from "../../cron/types.js";

export class CronTool extends Tool {
  private channel = "cli";
  private chatId = "direct";
  private accountId?: string;

  constructor(private cronService: CronService) {
    super();
  }

  get name(): string {
    return "cron";
  }

  get description(): string {
    return "Schedule a task to run later";
  }

  get parameters(): Record<string, unknown> {
    return {
      type: "object",
      properties: {
        name: { type: "string" },
        message: { type: "string" },
        every: { type: "integer" },
        cron: { type: "string" },
        at: { type: "string" },
        deliver: { type: "boolean" },
        accountId: { type: "string" }
      },
      required: ["name", "message"]
    };
  }

  setContext(channel: string, chatId: string, accountId?: string | null): void {
    this.channel = channel;
    this.chatId = chatId;
    this.accountId = typeof accountId === "string" && accountId.trim().length > 0 ? accountId : undefined;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const name = String(params.name ?? "");
    const message = String(params.message ?? "");
    const every = params.every ? Number(params.every) : undefined;
    const cron = params.cron ? String(params.cron) : undefined;
    const at = params.at ? String(params.at) : undefined;
    const deliver = Boolean(params.deliver ?? false);
    const accountId =
      typeof params.accountId === "string" && params.accountId.trim().length > 0 ? params.accountId : this.accountId;

    let schedule: CronSchedule | null = null;
    if (every) {
      schedule = { kind: "every", everyMs: every * 1000 };
    } else if (cron) {
      schedule = { kind: "cron", expr: cron };
    } else if (at) {
      const atMs = Date.parse(at);
      schedule = { kind: "at", atMs };
    }

    if (!schedule) {
      return "Error: Must specify --every, --cron, or --at";
    }

    const job = this.cronService.addJob({
      name,
      schedule,
      message,
      deliver,
      channel: this.channel,
      to: this.chatId,
      accountId
    });

    return `Scheduled job '${job.name}' (${job.id})`;
  }
}
