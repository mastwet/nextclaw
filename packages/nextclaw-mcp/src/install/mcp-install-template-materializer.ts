import type { McpServerDefinition, McpServerMetadata, McpServerScope } from "@nextclaw/core";
import {
  normalizeMcpServerName,
  type McpMarketplaceInstallTemplate,
  type McpMaterializeInstallParams
} from "../types.js";

export class McpInstallTemplateMaterializer {
  materialize(params: McpMaterializeInstallParams): { name: string; definition: McpServerDefinition } {
    const name = normalizeMcpServerName(params.name?.trim() || params.template.defaultName);
    const inputs = params.inputs ?? {};
    const definition = this.applyInputs(params.template.template, inputs);
    definition.enabled = params.enabled ?? definition.enabled;
    definition.scope = this.mergeScope(definition.scope, params.scope);
    definition.metadata = this.mergeMetadata(definition.metadata, params.template, params.metadata);
    return { name, definition };
  }

  private applyInputs(definition: McpServerDefinition, inputs: Record<string, string | undefined>): McpServerDefinition {
    const replacer = (value: string): string =>
      value.replace(/\{\{\s*([A-Za-z0-9._-]+)\s*\}\}/g, (_, key: string) => inputs[key]?.trim() ?? "");

    const transform = (value: unknown): unknown => {
      if (typeof value === "string") {
        return replacer(value);
      }
      if (Array.isArray(value)) {
        return value.map((entry) => transform(entry));
      }
      if (!value || typeof value !== "object") {
        return value;
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, transform(entry)])
      );
    };

    return transform(structuredClone(definition)) as McpServerDefinition;
  }

  private mergeScope(current: McpServerScope, override?: Partial<McpServerScope>): McpServerScope {
    if (!override) {
      return current;
    }
    const agents = Array.from(new Set((override.agents ?? current.agents ?? []).map((entry) => entry.trim()).filter(Boolean)));
    const allAgents = override.allAgents ?? current.allAgents ?? agents.length === 0;
    return {
      allAgents,
      agents: allAgents ? [] : agents
    };
  }

  private mergeMetadata(
    current: McpServerMetadata | undefined,
    template: McpMarketplaceInstallTemplate,
    override?: Partial<McpServerMetadata>
  ): McpServerMetadata {
    return {
      ...current,
      source: "marketplace",
      catalogSlug: template.spec,
      displayName: override?.displayName ?? current?.displayName,
      vendor: override?.vendor ?? current?.vendor,
      docsUrl: override?.docsUrl ?? current?.docsUrl,
      homepage: override?.homepage ?? current?.homepage,
      trustLevel: override?.trustLevel ?? current?.trustLevel ?? "official",
      installedAt: override?.installedAt ?? current?.installedAt ?? new Date().toISOString(),
      ...(override ?? {})
    };
  }
}
