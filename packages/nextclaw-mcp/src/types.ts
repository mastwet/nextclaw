import type {
  Config,
  McpServerDefinition,
  McpServerScope,
  McpTransport
} from "@nextclaw/core";

export type McpServerRecord = {
  name: string;
  definition: McpServerDefinition;
};

export type McpToolCatalogEntry = {
  qualifiedName: string;
  serverName: string;
  toolName: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export type McpServerWarmResult = {
  name: string;
  ok: boolean;
  toolCount: number;
  error?: string;
};

export type McpDoctorReport = {
  name: string;
  enabled: boolean;
  transport: McpTransport["type"];
  accessible: boolean;
  toolCount: number;
  error?: string;
};

export type McpConfigReconcileResult = {
  added: string[];
  removed: string[];
  enabled: string[];
  disabled: string[];
  restarted: string[];
  warmed: McpServerWarmResult[];
};

export type McpCatalogFilter = {
  agentId?: string;
};

export type McpLifecycleState = {
  record: McpServerRecord;
  tools: McpToolCatalogEntry[];
  clientReady: boolean;
  lastReadyAt?: string;
  lastError?: string;
};

export function normalizeMcpServerName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("MCP server name is required.");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error("MCP server name may only contain letters, numbers, dot, underscore, and dash.");
  }
  return normalized;
}

export function readDefaultAgentId(config: Config): string {
  return (
    config.agents.list.find((entry) => entry.default)?.id?.trim() ||
    config.agents.list[0]?.id?.trim() ||
    "main"
  );
}

export function isServerAccessibleToAgent(params: {
  config: Config;
  scope: McpServerScope;
  agentId?: string;
}): boolean {
  if (params.scope.allAgents) {
    return true;
  }

  const targetAgentId = params.agentId?.trim() || readDefaultAgentId(params.config);
  const explicitAgents = params.scope.agents
    .map((agentId) => agentId.trim())
    .filter(Boolean);
  if (explicitAgents.length > 0) {
    return explicitAgents.includes(targetAgentId);
  }

  return targetAgentId === readDefaultAgentId(params.config);
}

export function buildQualifiedMcpToolName(serverName: string, toolName: string): string {
  return `mcp_${sanitizeMcpSegment(serverName)}__${sanitizeMcpSegment(toolName)}`;
}

export function sanitizeMcpSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "unnamed";
}
