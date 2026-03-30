import { describe, expect, it, vi } from "vitest";
import { CronTool } from "./cron.js";

describe("CronTool", () => {
  it("adds a job with legacy flat params when action is omitted", async () => {
    const cronService = {
      addJob: vi.fn().mockReturnValue({ id: "job-1", name: "reminder" })
    };
    const tool = new CronTool(cronService as never);

    const result = JSON.parse(
      await tool.execute({
        name: "reminder",
        message: "take a break",
        every: 60
      })
    ) as { action: string; job: { id: string; name: string } };

    expect(result).toEqual({
      action: "add",
      job: { id: "job-1", name: "reminder" }
    });
    expect(cronService.addJob).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "reminder",
        message: "take a break",
        schedule: { kind: "every", everyMs: 60_000 }
      })
    );
  });

  it("supports skill aliases for add", async () => {
    const cronService = {
      addJob: vi.fn().mockReturnValue({ id: "job-2", name: "report" })
    };
    const tool = new CronTool(cronService as never);

    await tool.execute({
      action: "add",
      name: "report",
      message: "daily report",
      every_seconds: 120
    });

    expect(cronService.addJob).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { kind: "every", everyMs: 120_000 }
      })
    );
  });

  it("lists jobs when action is list", async () => {
    const cronService = {
      listJobs: vi.fn().mockReturnValue([{ id: "job-1", name: "reminder" }])
    };
    const tool = new CronTool(cronService as never);

    const result = JSON.parse(
      await tool.execute({
        action: "list",
        includeDisabled: true
      })
    ) as { jobs: Array<{ id: string; name: string }> };

    expect(result.jobs).toEqual([{ id: "job-1", name: "reminder" }]);
    expect(cronService.listJobs).toHaveBeenCalledWith(true);
  });

  it("removes jobs via job_id alias", async () => {
    const cronService = {
      removeJob: vi.fn().mockReturnValue(true)
    };
    const tool = new CronTool(cronService as never);

    const result = JSON.parse(
      await tool.execute({
        action: "remove",
        job_id: "job-3"
      })
    ) as { removed: boolean; jobId: string };

    expect(result).toEqual({ removed: true, jobId: "job-3" });
    expect(cronService.removeJob).toHaveBeenCalledWith("job-3");
  });

  it("rejects remove without a job id", async () => {
    const cronService = {
      removeJob: vi.fn()
    };
    const tool = new CronTool(cronService as never);

    const result = await tool.execute({
      action: "remove"
    });

    expect(result).toBe("Error: jobId is required for remove");
    expect(cronService.removeJob).not.toHaveBeenCalled();
  });
});
