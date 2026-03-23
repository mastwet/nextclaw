import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";

const require = createRequire(import.meta.url);

function resolveClaudeAgentSdkBaseDir(resolveModulePath: (specifier: string) => string): string | undefined {
  const candidates = ["@anthropic-ai/claude-agent-sdk/package.json", "@anthropic-ai/claude-agent-sdk"];
  for (const candidate of candidates) {
    try {
      return dirname(resolveModulePath(candidate));
    } catch {
      continue;
    }
  }
  return undefined;
}

export function resolveBundledClaudeAgentSdkCliPath(
  resolveModulePath: (specifier: string) => string = require.resolve.bind(require),
): string | undefined {
  const sdkBaseDir = resolveClaudeAgentSdkBaseDir(resolveModulePath);
  if (!sdkBaseDir) {
    return undefined;
  }

  const cliPath = join(sdkBaseDir, "cli.js");
  return existsSync(cliPath) ? cliPath : undefined;
}

export function resolveCurrentProcessExecutable(): string | undefined {
  const execPath = process.execPath?.trim();
  if (!execPath || !isAbsolute(execPath)) {
    return undefined;
  }
  return existsSync(execPath) ? execPath : undefined;
}
