import type { Config } from "@nextclaw/core";
import { McpRegistryService } from "../registry/mcp-registry-service.js";
import { type McpInstalledRecord } from "../types.js";

export class McpInstalledViewService {
  private readonly registryService: McpRegistryService;

  constructor(
    private readonly options: {
      getConfig: () => Config;
      registryService?: McpRegistryService;
    }
  ) {
    this.registryService = this.options.registryService ?? new McpRegistryService({
      getConfig: this.options.getConfig
    });
  }

  listInstalled(): McpInstalledRecord[] {
    return this.registryService.listServers().map((server) => {
      const metadata = server.definition.metadata;
      const cached = this.registryService.getCachedState(server.name);
      return {
        name: server.name,
        enabled: server.definition.enabled,
        transport: server.definition.transport.type,
        scope: server.definition.scope,
        source: metadata?.source === "marketplace" ? "marketplace" : "manual",
        catalogSlug: metadata?.catalogSlug,
        displayName: metadata?.displayName,
        vendor: metadata?.vendor,
        docsUrl: metadata?.docsUrl,
        homepage: metadata?.homepage,
        trustLevel: metadata?.trustLevel,
        installedAt: metadata?.installedAt,
        accessible: cached?.clientReady,
        toolCount: cached?.tools.length,
        lastReadyAt: cached?.lastReadyAt,
        lastError: cached?.lastError
      } satisfies McpInstalledRecord;
    });
  }
}
