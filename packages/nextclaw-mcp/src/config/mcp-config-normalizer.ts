import type { Config } from "@nextclaw/core";
import { normalizeMcpServerName, type McpServerRecord } from "../types.js";

export function listMcpServers(config: Config): McpServerRecord[] {
  return Object.entries(config.mcp.servers)
    .map(([name, definition]) => ({
      name: normalizeMcpServerName(name),
      definition
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getMcpServer(config: Config, name: string): McpServerRecord | undefined {
  const normalizedName = normalizeMcpServerName(name);
  const definition = config.mcp.servers[normalizedName];
  if (!definition) {
    return undefined;
  }
  return {
    name: normalizedName,
    definition
  };
}
