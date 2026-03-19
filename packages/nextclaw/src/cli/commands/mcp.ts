import { loadConfig, saveConfig, type McpServerDefinition } from "@nextclaw/core";
import { McpDoctorService, McpRegistryService, normalizeMcpServerName } from "@nextclaw/mcp";
import type { McpAddCommandOptions, McpDoctorOptions, McpListOptions } from "../types.js";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parsePairs(values: string[] | undefined, label: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const raw of values ?? []) {
    const index = raw.indexOf("=");
    if (index <= 0) {
      throw new Error(`Invalid ${label} entry: ${raw}. Expected key=value.`);
    }
    const key = raw.slice(0, index).trim();
    const value = raw.slice(index + 1);
    if (!key) {
      throw new Error(`Invalid ${label} entry: ${raw}. Expected key=value.`);
    }
    output[key] = value;
  }
  return output;
}

function parseTimeoutMs(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid timeout: ${String(value)}`);
  }
  return Math.trunc(parsed);
}

function buildMcpServerDefinition(command: string[], opts: McpAddCommandOptions): McpServerDefinition {
  const transport = (normalizeOptionalString(opts.transport) ?? "stdio").toLowerCase();
  const disabled = Boolean(opts.disabled);
  const allAgents = Boolean(opts.allAgents);
  const explicitAgents = Array.from(
    new Set(
      (opts.agent ?? [])
        .map((agentId) => normalizeOptionalString(agentId))
        .filter((agentId): agentId is string => Boolean(agentId))
    )
  );

  if (transport === "stdio") {
    if (command.length === 0) {
      throw new Error("stdio transport requires a command after --");
    }
    return {
      enabled: !disabled,
      transport: {
        type: "stdio",
        command: command[0],
        args: command.slice(1),
        cwd: normalizeOptionalString(opts.cwd),
        env: parsePairs(opts.env, "env"),
        stderr: (normalizeOptionalString(opts.stderr) ?? "pipe") as "inherit" | "pipe" | "ignore"
      },
      scope: {
        allAgents,
        agents: explicitAgents
      },
      policy: {
        trust: "explicit",
        start: "eager"
      }
    };
  }

  const url = normalizeOptionalString(opts.url);
  if (!url) {
    throw new Error(`${transport} transport requires --url`);
  }
  const timeoutMs = parseTimeoutMs(opts.timeoutMs);
  const shared = {
    enabled: !disabled,
    scope: {
      allAgents,
      agents: explicitAgents
    },
    policy: {
      trust: "explicit" as const,
      start: "eager" as const
    }
  };

  if (transport === "http") {
    return {
      ...shared,
      transport: {
        type: "http",
        url,
        headers: parsePairs(opts.header, "header"),
        timeoutMs: timeoutMs ?? 15000,
        verifyTls: !opts.insecure
      }
    };
  }

  if (transport === "sse") {
    return {
      ...shared,
      transport: {
        type: "sse",
        url,
        headers: parsePairs(opts.header, "header"),
        timeoutMs: timeoutMs ?? 15000,
        verifyTls: !opts.insecure,
        reconnect: {
          enabled: true,
          initialDelayMs: 1000,
          maxDelayMs: 30000
        }
      }
    };
  }

  throw new Error(`Unsupported MCP transport: ${transport}`);
}

export class McpCommands {
  mcpList(opts: McpListOptions = {}): void {
    const registry = new McpRegistryService({
      getConfig: () => loadConfig()
    });
    const servers = registry.listServers().map((server) => ({
      name: server.name,
      enabled: server.definition.enabled,
      transport: server.definition.transport.type,
      scope: server.definition.scope
    }));

    if (opts.json) {
      console.log(JSON.stringify({ servers }, null, 2));
      return;
    }

    if (servers.length === 0) {
      console.log("No MCP servers configured.");
      return;
    }

    for (const server of servers) {
      const scope = server.scope.allAgents
        ? "all-agents"
        : server.scope.agents.length > 0
          ? `agents=${server.scope.agents.join(",")}`
          : "default-agent";
      console.log(`${server.enabled ? "ENABLED " : "DISABLED"} ${server.name} (${server.transport}, ${scope})`);
    }
  }

  async mcpAdd(name: string, command: string[], opts: McpAddCommandOptions): Promise<void> {
    const normalizedName = normalizeMcpServerName(name);
    const config = loadConfig();
    if (config.mcp.servers[normalizedName]) {
      reportUserInputIssue(`MCP server already exists: ${normalizedName}. Use 'mcp list' or remove it first.`);
      return;
    }

    config.mcp.servers[normalizedName] = buildMcpServerDefinition(command, opts);
    saveConfig(config);
    console.log(`Added MCP server ${normalizedName}.`);
  }

  async mcpRemove(name: string): Promise<void> {
    const normalizedName = normalizeMcpServerName(name);
    const config = loadConfig();
    if (!config.mcp.servers[normalizedName]) {
      reportUserInputIssue(`Unknown MCP server: ${normalizedName}`);
      return;
    }
    delete config.mcp.servers[normalizedName];
    saveConfig(config);
    console.log(`Removed MCP server ${normalizedName}.`);
  }

  async mcpEnable(name: string): Promise<void> {
    await this.toggleEnabled(name, true);
  }

  async mcpDisable(name: string): Promise<void> {
    await this.toggleEnabled(name, false);
  }

  async mcpDoctor(name?: string, opts: McpDoctorOptions = {}): Promise<void> {
    const registry = new McpRegistryService({
      getConfig: () => loadConfig()
    });
    const doctor = new McpDoctorService({
      getConfig: () => loadConfig(),
      registryService: registry
    });

    try {
      const reports = await doctor.inspect(name);
      if (opts.json) {
        console.log(JSON.stringify({ reports }, null, 2));
        return;
      }

      if (reports.length === 0) {
        console.log("No MCP servers matched.");
        return;
      }

      for (const report of reports) {
        const status = report.error ? "ERROR" : "OK";
        const detail = report.error ? ` (${report.error})` : "";
        console.log(
          `[${status}] ${report.name} enabled=${report.enabled} transport=${report.transport} tools=${report.toolCount}${detail}`
        );
      }
    } finally {
      await registry.close();
    }
  }

  private async toggleEnabled(name: string, enabled: boolean): Promise<void> {
    const normalizedName = normalizeMcpServerName(name);
    const config = loadConfig();
    const current = config.mcp.servers[normalizedName];
    if (!current) {
      reportUserInputIssue(`Unknown MCP server: ${normalizedName}`);
      return;
    }
    current.enabled = enabled;
    saveConfig(config);
    console.log(`${enabled ? "Enabled" : "Disabled"} MCP server ${normalizedName}.`);
  }
}

function reportUserInputIssue(message: string): void {
  console.error(message);
  process.exitCode = 1;
}
