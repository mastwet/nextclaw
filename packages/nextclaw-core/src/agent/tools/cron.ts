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
    return "Manage scheduled tasks (add, list, remove)";
  }

  get parameters(): Record<string, unknown> {
    return {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action to perform: add, list, or remove"
        },
        name: { type: "string" },
        message: { type: "string" },
        every: { type: "integer" },
        every_seconds: { type: "integer" },
        cron: { type: "string" },
        cron_expr: { type: "string" },
        at: { type: "string" },
        deliver: { type: "boolean" },
        accountId: { type: "string" },
        account_id: { type: "string" },
        includeDisabled: { type: "boolean" },
        jobId: { type: "string" },
        job_id: { type: "string" },
        id: { type: "string" }
      }
    };
  }

  setContext(channel: string, chatId: string, accountId?: string | null): void {
    this.channel = channel;
    this.chatId = chatId;
    this.accountId = typeof accountId === "string" && accountId.trim().length > 0 ? accountId : undefined;
  }

  async execute(params: Record<string, unknown>): Promise<string> {
    const action = this.readAction(params);
    if (action === "list") {
      return JSON.stringify({
        jobs: this.cronService.listJobs(Boolean(params.includeDisabled))
      });
    }
    if (action === "remove") {
      const jobId = this.readJobId(params);
      if (!jobId) {
        return "Error: jobId is required for remove";
      }
      const removed = this.cronService.removeJob(jobId);
      return JSON.stringify({ removed, jobId });
    }

    const name = this.readString(params, "name");
    const message = this.readString(params, "message");
    if (!name || !message) {
      return "Error: name and message are required for add";
    }
    const schedule = this.readSchedule(params);
    if (!schedule) {
      return "Error: Must specify --every, --cron, or --at";
    }
    const deliver = Boolean(params.deliver ?? false);
    const accountId = this.readAccountId(params);
    const job = this.cronService.addJob({
      name,
      schedule,
      message,
      deliver,
      channel: this.channel,
      to: this.chatId,
      accountId
    });

    return JSON.stringify({
      action: "add",
      job: {
        id: job.id,
        name: job.name
      }
    });
  }

  private readAction = (params: Record<string, unknown>): "add" | "list" | "remove" => {
    const action = this.readString(params, "action")?.toLowerCase();
    if (action === "list" || action === "remove") {
      return action;
    }
    return "add";
  };

  private readSchedule = (params: Record<string, unknown>): CronSchedule | null => {
    const every = this.readNumber(params.every) ?? this.readNumber(params.every_seconds);
    const cron = this.readString(params, "cron") ?? this.readString(params, "cron_expr");
    const at = this.readString(params, "at");
    if (every) {
      return { kind: "every", everyMs: every * 1000 };
    }
    if (cron) {
      return { kind: "cron", expr: cron };
    }
    if (at) {
      return { kind: "at", atMs: Date.parse(at) };
    }
    return null;
  };

  private readJobId = (params: Record<string, unknown>): string | undefined => {
    return this.readString(params, "jobId") ?? this.readString(params, "job_id") ?? this.readString(params, "id");
  };

  private readAccountId = (params: Record<string, unknown>): string | undefined => {
    return this.readString(params, "accountId") ?? this.readString(params, "account_id") ?? this.accountId;
  };

  private readString = (params: Record<string, unknown>, key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  };

  private readNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };
}
