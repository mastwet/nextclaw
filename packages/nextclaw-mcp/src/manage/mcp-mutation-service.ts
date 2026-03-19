import type { Config, McpServerDefinition } from "@nextclaw/core";
import { getMcpServer, listMcpServers } from "../config/mcp-config-normalizer.js";
import { McpInstallTemplateMaterializer } from "../install/mcp-install-template-materializer.js";
import {
  normalizeMcpServerName,
  type McpMarketplaceInstallTemplate,
  type McpMaterializeInstallParams,
  type McpMutationResult
} from "../types.js";

export class McpMutationService {
  private readonly materializer: McpInstallTemplateMaterializer;

  constructor(
    private readonly options: {
      getConfig: () => Config;
      saveConfig: (config: Config) => void;
      materializer?: McpInstallTemplateMaterializer;
    }
  ) {
    this.materializer = this.options.materializer ?? new McpInstallTemplateMaterializer();
  }

  listServerNames(): string[] {
    return listMcpServers(this.options.getConfig()).map((record) => record.name);
  }

  addServer(name: string, definition: McpServerDefinition): McpMutationResult {
    const normalizedName = normalizeMcpServerName(name);
    const config = this.options.getConfig();
    if (config.mcp.servers[normalizedName]) {
      return {
        changed: false,
        name: normalizedName,
        message: `MCP server already exists: ${normalizedName}. Use 'mcp list' or remove it first.`,
        definition: config.mcp.servers[normalizedName]
      };
    }

    config.mcp.servers[normalizedName] = definition;
    this.options.saveConfig(config);
    return {
      changed: true,
      name: normalizedName,
      message: `Added MCP server ${normalizedName}.`,
      definition
    };
  }

  updateServer(name: string, definition: McpServerDefinition): McpMutationResult {
    const normalizedName = normalizeMcpServerName(name);
    const config = this.options.getConfig();
    if (!config.mcp.servers[normalizedName]) {
      return {
        changed: false,
        name: normalizedName,
        message: `Unknown MCP server: ${normalizedName}`
      };
    }

    config.mcp.servers[normalizedName] = definition;
    this.options.saveConfig(config);
    return {
      changed: true,
      name: normalizedName,
      message: `Updated MCP server ${normalizedName}.`,
      definition
    };
  }

  removeServer(name: string): McpMutationResult {
    const normalizedName = normalizeMcpServerName(name);
    const config = this.options.getConfig();
    if (!config.mcp.servers[normalizedName]) {
      return {
        changed: false,
        name: normalizedName,
        message: `Unknown MCP server: ${normalizedName}`
      };
    }
    delete config.mcp.servers[normalizedName];
    this.options.saveConfig(config);
    return {
      changed: true,
      name: normalizedName,
      message: `Removed MCP server ${normalizedName}.`
    };
  }

  toggleEnabled(name: string, enabled: boolean): McpMutationResult {
    const normalizedName = normalizeMcpServerName(name);
    const config = this.options.getConfig();
    const current = config.mcp.servers[normalizedName];
    if (!current) {
      return {
        changed: false,
        name: normalizedName,
        message: `Unknown MCP server: ${normalizedName}`
      };
    }
    current.enabled = enabled;
    this.options.saveConfig(config);
    return {
      changed: true,
      name: normalizedName,
      message: `${enabled ? "Enabled" : "Disabled"} MCP server ${normalizedName}.`,
      definition: current
    };
  }

  installFromTemplate(params: Omit<McpMaterializeInstallParams, "template"> & {
    template: McpMarketplaceInstallTemplate;
  }): McpMutationResult {
    const materialized = this.materializer.materialize(params);
    return this.addServer(materialized.name, materialized.definition);
  }

  duplicateServer(sourceName: string, targetName: string): McpMutationResult {
    const source = getMcpServer(this.options.getConfig(), sourceName);
    if (!source) {
      return {
        changed: false,
        name: normalizeMcpServerName(sourceName),
        message: `Unknown MCP server: ${normalizeMcpServerName(sourceName)}`
      };
    }
    const definition = structuredClone(source.definition) as McpServerDefinition;
    if (definition.metadata) {
      definition.metadata = {
        ...definition.metadata,
        installedAt: new Date().toISOString()
      };
    }
    return this.addServer(targetName, definition);
  }

  renameServer(sourceName: string, targetName: string): McpMutationResult {
    const source = getMcpServer(this.options.getConfig(), sourceName);
    if (!source) {
      return {
        changed: false,
        name: normalizeMcpServerName(sourceName),
        message: `Unknown MCP server: ${normalizeMcpServerName(sourceName)}`
      };
    }

    const nextName = normalizeMcpServerName(targetName);
    const config = this.options.getConfig();
    if (source.name === nextName) {
      return {
        changed: false,
        name: nextName,
        message: `MCP server already named ${nextName}.`,
        definition: source.definition
      };
    }
    if (config.mcp.servers[nextName]) {
      return {
        changed: false,
        name: nextName,
        message: `MCP server already exists: ${nextName}. Use another name.`
      };
    }

    delete config.mcp.servers[source.name];
    config.mcp.servers[nextName] = source.definition;
    this.options.saveConfig(config);
    return {
      changed: true,
      name: nextName,
      message: `Renamed MCP server ${source.name} -> ${nextName}.`,
      definition: source.definition
    };
  }
}
