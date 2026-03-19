import type { Config } from "@nextclaw/core";
import { getMcpServer, listMcpServers } from "../config/mcp-config-normalizer.js";
import { McpServerLifecycleManager } from "../lifecycle/mcp-server-lifecycle-manager.js";
import {
  isServerAccessibleToAgent,
  type McpCatalogFilter,
  type McpServerRecord,
  type McpServerWarmResult,
  type McpToolCatalogEntry
} from "../types.js";

export class McpRegistryService {
  private readonly lifecycleManager: McpServerLifecycleManager;

  constructor(
    private readonly options: {
      getConfig: () => Config;
      lifecycleManager?: McpServerLifecycleManager;
    }
  ) {
    this.lifecycleManager = this.options.lifecycleManager ?? new McpServerLifecycleManager({
      getConfig: this.options.getConfig
    });
  }

  listServers(): McpServerRecord[] {
    return listMcpServers(this.options.getConfig());
  }

  getServer(name: string): McpServerRecord | undefined {
    return getMcpServer(this.options.getConfig(), name);
  }

  async prewarmEnabledServers(): Promise<McpServerWarmResult[]> {
    const results = await Promise.all(
      this.listServers()
        .filter((record) => record.definition.enabled)
        .map(async (record) => {
          try {
            const state = await this.lifecycleManager.warmServer(record);
            return {
              name: record.name,
              ok: true,
              toolCount: state.tools.length
            } satisfies McpServerWarmResult;
          } catch (error) {
            return {
              name: record.name,
              ok: false,
              toolCount: 0,
              error: toErrorMessage(error)
            } satisfies McpServerWarmResult;
          }
        })
    );
    return results.sort((left, right) => left.name.localeCompare(right.name));
  }

  async warmServer(name: string): Promise<McpServerWarmResult> {
    const server = this.getServer(name);
    if (!server) {
      throw new Error(`Unknown MCP server: ${name}`);
    }

    try {
      const state = await this.lifecycleManager.warmServer(server);
      return {
        name: server.name,
        ok: true,
        toolCount: state.tools.length
      };
    } catch (error) {
      return {
        name: server.name,
        ok: false,
        toolCount: 0,
        error: toErrorMessage(error)
      };
    }
  }

  listAccessibleTools(filter: McpCatalogFilter = {}): McpToolCatalogEntry[] {
    const config = this.options.getConfig();
    return this.listServers()
      .filter((record) => record.definition.enabled)
      .filter((record) =>
        isServerAccessibleToAgent({
          config,
          scope: record.definition.scope,
          agentId: filter.agentId
        })
      )
      .flatMap((record) => this.lifecycleManager.getCachedCatalog(record.name))
      .sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
  }

  async callTool(params: {
    serverName: string;
    toolName: string;
    args: Record<string, unknown>;
  }): Promise<unknown> {
    const server = this.getServer(params.serverName);
    if (!server) {
      throw new Error(`Unknown MCP server: ${params.serverName}`);
    }
    return this.lifecycleManager.callTool(server, params.toolName, params.args);
  }

  async close(): Promise<void> {
    await this.lifecycleManager.closeAll();
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
