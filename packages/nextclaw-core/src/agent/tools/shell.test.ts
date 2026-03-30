import { describe, expect, it, vi } from "vitest";
import { ExecTool } from "./shell.js";
import { createExternalCommandEnv, sanitizeNodeOptionsForExternalCommand } from "../../utils/child-process-env.js";

describe("ExecTool", () => {
  it("removes development node conditions before launching external commands", async () => {
    const runner = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const tool = new ExecTool({}, runner);
    const originalNodeOptions = process.env.NODE_OPTIONS;

    process.env.NODE_OPTIONS = "--trace-warnings --conditions=development --max-old-space-size=4096";

    try {
      const result = await tool.execute({ command: "nextclaw cron list" });

      expect(result).toBe("ok");
      expect(runner).toHaveBeenCalledWith(
        "nextclaw cron list",
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_OPTIONS: "--trace-warnings --max-old-space-size=4096"
          })
        })
      );
    } finally {
      if (typeof originalNodeOptions === "string") {
        process.env.NODE_OPTIONS = originalNodeOptions;
      } else {
        delete process.env.NODE_OPTIONS;
      }
    }
  });

  it("passes windowsHide on Windows to avoid flashing cmd windows", async () => {
    const runner = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const tool = new ExecTool({}, runner);
    const originalPlatform = process.platform;

    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });

    try {
      const result = await tool.execute({ command: "echo hello" });

      expect(result).toBe("ok");
      expect(runner).toHaveBeenCalledWith(
        "echo hello",
        expect.objectContaining({
          windowsHide: true,
        }),
      );
    } finally {
      Object.defineProperty(process, "platform", {
        configurable: true,
        value: originalPlatform,
      });
    }
  });
});

describe("createExternalCommandEnv", () => {
  it("drops NODE_OPTIONS entirely when only the development condition is present", () => {
    expect(createExternalCommandEnv({ NODE_OPTIONS: "--conditions=development" }).NODE_OPTIONS).toBeUndefined();
  });

  it("keeps other node options untouched", () => {
    expect(sanitizeNodeOptionsForExternalCommand("--trace-warnings --max-old-space-size=4096")).toBe(
      "--trace-warnings --max-old-space-size=4096"
    );
  });
});
