import { DomainValidationError } from "../domain/errors";
import type {
  LocalizedTextMap,
  MarketplaceCatalogSection,
  MarketplaceItem,
  MarketplaceMcpInstallSpec,
  MarketplaceRecommendationScene
} from "../domain/model";
import { BaseMarketplaceDataSource } from "./data-source";

type McpItemRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  summary_i18n: string;
  description: string | null;
  description_i18n: string | null;
  tags: string;
  author: string;
  source_repo: string | null;
  homepage: string | null;
  vendor: string | null;
  docs_url: string | null;
  icon_url: string | null;
  transport_types: string;
  trust_level: string;
  trust_notes: string | null;
  install_kind: string;
  install_spec: string;
  install_command: string;
  install_default_name: string;
  install_template: string;
  install_inputs: string;
  content_markdown: string;
  content_source_url: string | null;
  published_at: string;
  updated_at: string;
};

type SceneRow = {
  scene_id: string;
  title: string;
  description: string | null;
  item_id: string | null;
};

export class D1MarketplaceMcpDataSource extends BaseMarketplaceDataSource {
  constructor(private readonly db: D1Database) {
    super();
  }

  async loadSection(): Promise<MarketplaceCatalogSection> {
    const itemsResult = await this.db
      .prepare(`
        SELECT
          id,
          slug,
          name,
          summary,
          summary_i18n,
          description,
          description_i18n,
          tags,
          author,
          source_repo,
          homepage,
          vendor,
          docs_url,
          icon_url,
          transport_types,
          trust_level,
          trust_notes,
          install_kind,
          install_spec,
          install_command,
          install_default_name,
          install_template,
          install_inputs,
          content_markdown,
          content_source_url,
          published_at,
          updated_at
        FROM marketplace_mcp_items
      `)
      .all<McpItemRow>();

    const sceneResult = await this.db
      .prepare(`
        SELECT
          s.id AS scene_id,
          s.title,
          s.description,
          i.item_id
        FROM marketplace_mcp_recommendation_scenes s
        LEFT JOIN marketplace_mcp_recommendation_items i ON i.scene_id = s.id
        ORDER BY s.id ASC, i.sort_order ASC
      `)
      .all<SceneRow>();

    const items = (itemsResult.results ?? []).map((row) => this.mapItemRow(row));
    const recommendations = this.mapScenes(sceneResult.results ?? [], items);
    return {
      items,
      recommendations
    };
  }

  private mapItemRow(row: McpItemRow): MarketplaceItem {
    const summaryI18n = this.parseLocalizedMap(row.summary_i18n, `marketplace_mcp_items.summary_i18n(${row.slug})`, row.summary);
    const description = row.description ?? undefined;
    const descriptionI18n = description
      ? this.parseLocalizedMap(
          row.description_i18n ?? "{}",
          `marketplace_mcp_items.description_i18n(${row.slug})`,
          description
        )
      : undefined;
    const transportTypes = this.parseTransportTypes(row.transport_types, row.slug);
    const install = this.parseInstall(row, transportTypes);

    return {
      id: row.id,
      slug: row.slug,
      type: "mcp",
      name: row.name,
      summary: row.summary,
      summaryI18n,
      description,
      descriptionI18n,
      tags: this.parseStringArray(row.tags, `marketplace_mcp_items.tags(${row.slug})`),
      author: row.author,
      sourceRepo: row.source_repo ?? undefined,
      homepage: row.homepage ?? undefined,
      vendor: row.vendor ?? undefined,
      docsUrl: row.docs_url ?? undefined,
      iconUrl: row.icon_url ?? undefined,
      transportTypes,
      trust: {
        level: this.parseTrustLevel(row.trust_level, row.slug),
        notes: row.trust_notes ?? undefined
      },
      install,
      contentMarkdown: row.content_markdown,
      contentSourceUrl: row.content_source_url ?? undefined,
      publishedAt: row.published_at,
      updatedAt: row.updated_at
    };
  }

  private mapScenes(rows: SceneRow[], items: MarketplaceItem[]): MarketplaceRecommendationScene[] {
    const itemIds = new Set(items.map((item) => item.id));
    const sceneMap = new Map<string, MarketplaceRecommendationScene>();

    for (const row of rows) {
      let scene = sceneMap.get(row.scene_id);
      if (!scene) {
        scene = {
          id: row.scene_id,
          title: row.title,
          description: row.description ?? undefined,
          itemIds: []
        };
        sceneMap.set(row.scene_id, scene);
      }

      if (row.item_id && itemIds.has(row.item_id)) {
        scene.itemIds.push(row.item_id);
      }
    }

    return [...sceneMap.values()];
  }

  private parseInstall(row: McpItemRow, transportTypes: Array<"stdio" | "http" | "sse">): MarketplaceMcpInstallSpec {
    if (row.install_kind !== "template") {
      throw new DomainValidationError(`mcp install.kind must be template: ${row.slug}`);
    }
    const template = this.parseJsonRecord(row.install_template, `marketplace_mcp_items.install_template(${row.slug})`);
    const inputs = this.parseInputFields(row.install_inputs, row.slug);
    return {
      kind: "template",
      spec: row.install_spec,
      command: row.install_command,
      defaultName: row.install_default_name,
      transportTypes,
      template,
      inputs
    };
  }

  private parseTransportTypes(raw: string, slug: string): Array<"stdio" | "http" | "sse"> {
    const parsed = this.parseStringArray(raw, `marketplace_mcp_items.transport_types(${slug})`);
    const filtered = parsed.filter((entry): entry is "stdio" | "http" | "sse" =>
      entry === "stdio" || entry === "http" || entry === "sse"
    );
    if (filtered.length === 0) {
      throw new DomainValidationError(`mcp transport_types must include stdio|http|sse: ${slug}`);
    }
    return filtered;
  }

  private parseTrustLevel(raw: string, slug: string): "official" | "verified" | "community" {
    if (raw === "official" || raw === "verified" || raw === "community") {
      return raw;
    }
    throw new DomainValidationError(`mcp trust_level must be official|verified|community: ${slug}`);
  }

  private parseInputFields(raw: string, slug: string) {
    const parsed = this.parseJsonArray(raw, `marketplace_mcp_items.install_inputs(${slug})`);
    return parsed.map((entry, index) => {
      const record = this.ensureRecord(entry, `marketplace_mcp_items.install_inputs(${slug})[${index}]`);
      const id = this.readRequiredString(record.id, `install_inputs.id(${slug})[${index}]`);
      const label = this.readRequiredString(record.label, `install_inputs.label(${slug})[${index}]`);
      return {
        id,
        label,
        description: this.readOptionalString(record.description),
        required: typeof record.required === "boolean" ? record.required : undefined,
        secret: typeof record.secret === "boolean" ? record.secret : undefined,
        defaultValue: this.readOptionalString(record.defaultValue)
      };
    });
  }

  private parseLocalizedMap(raw: string, label: string, fallback: string): LocalizedTextMap {
    const record = this.parseJsonRecord(raw, label);
    const localized: LocalizedTextMap = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && value.trim().length > 0) {
        localized[key] = value.trim();
      }
    }
    if (!localized.en) {
      localized.en = fallback;
    }
    return localized;
  }

  private parseStringArray(raw: string, label: string): string[] {
    const array = this.parseJsonArray(raw, label);
    return array
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private parseJsonRecord(raw: string, label: string): Record<string, unknown> {
    const parsed = this.parseJson(raw, label);
    return this.ensureRecord(parsed, label);
  }

  private parseJsonArray(raw: string, label: string): unknown[] {
    const parsed = this.parseJson(raw, label);
    if (!Array.isArray(parsed)) {
      throw new DomainValidationError(`${label} must be a JSON array`);
    }
    return parsed;
  }

  private parseJson(raw: string, label: string): unknown {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new DomainValidationError(`${label} must be valid JSON: ${String(error)}`);
    }
  }

  private ensureRecord(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new DomainValidationError(`${label} must be a JSON object`);
    }
    return value as Record<string, unknown>;
  }

  private readRequiredString(value: unknown, label: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new DomainValidationError(`${label} must be a non-empty string`);
    }
    return value.trim();
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed || undefined;
  }
}
