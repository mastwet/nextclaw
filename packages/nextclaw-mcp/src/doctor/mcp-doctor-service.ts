import type { Config } from "@nextclaw/core";
import { McpRegistryService } from "../registry/mcp-registry-service.js";
import { type McpDoctorReport } from "../types.js";

export class McpDoctorService {
  constructor(
    private readonly options: {
      getConfig: () => Config;
      registryService?: McpRegistryService;
    }
  ) {}

  async inspect(name?: string): Promise<McpDoctorReport[]> {
    const registry = this.options.registryService ?? new McpRegistryService({
      getConfig: this.options.getConfig
    });
    const specificServer = name ? registry.getServer(name) : undefined;
    const servers = specificServer ? [specificServer] : name ? [] : registry.listServers();
    return await Promise.all(
      servers.map(async (server) => {
        const warmResult = await registry.warmServer(server.name);
        return {
          name: server.name,
          enabled: server.definition.enabled,
          transport: server.definition.transport.type,
          accessible: warmResult.ok,
          toolCount: warmResult.toolCount,
          ...(warmResult.error ? { error: warmResult.error } : {})
        } satisfies McpDoctorReport;
      })
    );
  }
}
