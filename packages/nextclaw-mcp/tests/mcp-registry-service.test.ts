import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigSchema } from "@nextclaw/core";
import { McpRegistryService } from "../src/index.js";

const fixturePath = resolve(import.meta.dirname, "fixtures/mock-mcp-server.mjs");
const childProcesses: ChildProcessWithoutNullStreams[] = [];

async function waitForReady(process: ChildProcessWithoutNullStreams): Promise<string> {
  return await new Promise((resolveReady, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const line = buffer.split("\n").find((entry) => entry.startsWith("READY "));
      if (!line) {
        return;
      }
      cleanup();
      const parts = line.trim().split(/\s+/g);
      resolveReady(parts.at(-1) ?? "");
    };
    const onExit = () => {
      cleanup();
      reject(new Error(`fixture exited before ready: ${buffer}`));
    };
    const cleanup = () => {
      process.stdout.off("data", onData);
      process.stderr.off("data", onData);
      process.off("exit", onExit);
    };
    process.stdout.on("data", onData);
    process.stderr.on("data", onData);
    process.on("exit", onExit);
  });
}

function spawnFixture(mode: "http" | "sse"): Promise<{ url: string; process: ChildProcessWithoutNullStreams }> {
  const child = spawn(process.execPath, [fixturePath, mode, "0"], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  childProcesses.push(child);
  return waitForReady(child).then((url) => ({ url, process: child }));
}

afterEach(async () => {
  while (childProcesses.length > 0) {
    const child = childProcesses.pop();
    if (!child) {
      continue;
    }
    if (child.exitCode !== null) {
      continue;
    }
    child.kill("SIGKILL");
    await new Promise((resolveClose) => child.once("exit", () => resolveClose(undefined)));
  }
});

describe("McpRegistryService", () => {
  it("prewarms and calls a stdio MCP server", async () => {
    const config = ConfigSchema.parse({
      mcp: {
        servers: {
          demo: {
            enabled: true,
            transport: {
              type: "stdio",
              command: process.execPath,
              args: [fixturePath, "stdio"],
              stderr: "pipe"
            }
          }
        }
      }
    });
    const registry = new McpRegistryService({
      getConfig: () => config
    });

    const warmResults = await registry.prewarmEnabledServers();
    expect(warmResults).toEqual([
      {
        name: "demo",
        ok: true,
        toolCount: 1
      }
    ]);

    const tools = registry.listAccessibleTools({ agentId: "main" });
    expect(tools).toHaveLength(1);
    expect(registry.listAccessibleTools({ agentId: "other-agent" })).toHaveLength(0);

    const result = await registry.callTool({
      serverName: "demo",
      toolName: tools[0].toolName,
      args: {}
    });

    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          text: "echo:ok"
        }
      ]
    });

    await registry.close();
  });

  it("prewarms and calls a streamable HTTP MCP server", async () => {
    const { url } = await spawnFixture("http");
    const config = ConfigSchema.parse({
      mcp: {
        servers: {
          demo: {
            enabled: true,
            transport: {
              type: "http",
              url
            },
            scope: {
              allAgents: true
            }
          }
        }
      }
    });
    const registry = new McpRegistryService({
      getConfig: () => config
    });

    const warm = await registry.warmServer("demo");
    expect(warm.ok).toBe(true);
    expect(warm.toolCount).toBe(1);

    const tool = registry.listAccessibleTools({ agentId: "other-agent" })[0];
    const result = await registry.callTool({
      serverName: "demo",
      toolName: tool.toolName,
      args: {}
    });

    expect(result).toMatchObject({
      content: [
        {
          text: "echo:ok"
        }
      ]
    });

    await registry.close();
  });

  it("prewarms and calls an SSE MCP server", async () => {
    const { url } = await spawnFixture("sse");
    const config = ConfigSchema.parse({
      mcp: {
        servers: {
          demo: {
            enabled: true,
            transport: {
              type: "sse",
              url
            },
            scope: {
              allAgents: true
            }
          }
        }
      }
    });
    const registry = new McpRegistryService({
      getConfig: () => config
    });

    const warm = await registry.warmServer("demo");
    expect(warm.ok).toBe(true);
    expect(warm.toolCount).toBe(1);

    const tool = registry.listAccessibleTools({ agentId: "any-agent" })[0];
    const result = await registry.callTool({
      serverName: "demo",
      toolName: tool.toolName,
      args: {}
    });

    expect(result).toMatchObject({
      content: [
        {
          text: "echo:ok"
        }
      ]
    });

    await registry.close();
  });
});
