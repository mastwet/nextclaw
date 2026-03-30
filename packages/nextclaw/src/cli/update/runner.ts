import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createExternalCommandEnv } from "@nextclaw/core";
import { findExecutableOnPath } from "../utils.js";

const DEFAULT_TIMEOUT_MS = 20 * 60_000;

export type UpdateStep = {
  cmd: string;
  args: string[];
  cwd: string;
  code: number | null;
  stdout: string;
  stderr: string;
};

export type SelfUpdateResult = {
  ok: boolean;
  error?: string;
  strategy: "command" | "npm" | "none";
  steps: UpdateStep[];
};

export type SelfUpdateOptions = {
  timeoutMs?: number;
  cwd?: string;
  updateCommand?: string;
  packageName?: string;
};

export function runSelfUpdate(options: SelfUpdateOptions = {}): SelfUpdateResult {
  const steps: UpdateStep[] = [];
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const updateCommand = options.updateCommand ?? process.env.NEXTCLAW_UPDATE_COMMAND?.trim();
  const packageName = options.packageName ?? "nextclaw";

  const resolveShellCommand = (command: string): { cmd: string; args: string[] } => {
    if (process.platform === "win32") {
      return { cmd: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command] };
    }
    return { cmd: process.env.SHELL || "sh", args: ["-c", command] };
  };

  const runStep = (cmd: string, args: string[], cwd: string): { ok: boolean; code: number | null } => {
    const result = spawnSync(cmd, args, {
      cwd,
      env: createExternalCommandEnv(process.env),
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: "pipe"
    });
    steps.push({
      cmd,
      args,
      cwd,
      code: result.status,
      stdout: (result.stdout ?? "").toString().slice(0, 4000),
      stderr: (result.stderr ?? "").toString().slice(0, 4000)
    });
    return { ok: result.status === 0, code: result.status };
  };

  if (updateCommand) {
    const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
    const shellCommand = resolveShellCommand(updateCommand);
    const ok = runStep(shellCommand.cmd, shellCommand.args, cwd);
    if (!ok.ok) {
      return { ok: false, error: "update command failed", strategy: "command", steps };
    }
    return { ok: true, strategy: "command", steps };
  }

  const npmExecutable = findExecutableOnPath("npm");
  if (npmExecutable) {
    const ok = runStep(npmExecutable, ["i", "-g", packageName], process.cwd());
    if (!ok.ok) {
      return { ok: false, error: `npm install -g ${packageName} failed`, strategy: "npm", steps };
    }
    return { ok: true, strategy: "npm", steps };
  }

  return { ok: false, error: "no update strategy available", strategy: "none", steps };
}
