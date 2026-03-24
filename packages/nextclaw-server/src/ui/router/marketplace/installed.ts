import * as NextclawCore from "@nextclaw/core";
import { buildPluginStatusReport } from "@nextclaw/openclaw-compat";
import { loadConfigOrDefault } from "../../config.js";
import type {
  MarketplaceInstalledRecord,
  MarketplaceInstalledView,
  MarketplaceItemView,
  MarketplaceListView
} from "../../types.js";
import { readNonEmptyString } from "../response.js";
import type { SkillsLoaderConstructor, SkillsLoaderInstance, UiRouterOptions } from "../types.js";
import { MARKETPLACE_ZH_COPY_BY_SLUG } from "./constants.js";
import {
  dedupeInstalledPluginRecordsByCanonicalSpec,
  isSupportedMarketplacePluginSpec,
  normalizePluginNpmSpec,
  resolvePluginCanonicalSpec
} from "./spec.js";

const getWorkspacePathFromConfig = NextclawCore.getWorkspacePathFromConfig;

function createSkillsLoader(workspace: string): SkillsLoaderInstance | null {
  const ctor = (NextclawCore as { SkillsLoader?: SkillsLoaderConstructor }).SkillsLoader;
  if (!ctor) {
    return null;
  }
  return new ctor(workspace);
}

export function collectInstalledPluginRecords(options: UiRouterOptions): {
  records: MarketplaceInstalledRecord[];
  specs: string[];
} {
  const config = loadConfigOrDefault(options.configPath);
  const pluginRecordsMap = config.plugins.installs ?? {};
  const pluginEntries = config.plugins.entries ?? {};
  const pluginRecords: MarketplaceInstalledRecord[] = [];
  const seenPluginIds = new Set<string>();

  let discoveredPlugins: ReturnType<typeof buildPluginStatusReport>["plugins"] = [];
  try {
    const pluginReport = buildPluginStatusReport({
      config,
      workspaceDir: getWorkspacePathFromConfig(config),
      // Marketplace installed view only needs discoverable plugin metadata.
      // Avoid importing external plugin modules on every page load.
      mode: "validate"
    });
    discoveredPlugins = pluginReport.plugins;
  } catch {
    discoveredPlugins = [];
  }

  const readPluginPriority = (plugin: ReturnType<typeof buildPluginStatusReport>["plugins"][number]): number => {
    const hasInstallRecord = Boolean(pluginRecordsMap[plugin.id]);

    const statusScore = plugin.status === "loaded"
      ? 300
      : plugin.status === "disabled"
        ? 200
        : 100;

    let originScore = 0;
    if (hasInstallRecord) {
      originScore = plugin.origin === "workspace"
        ? 40
        : plugin.origin === "global"
          ? 30
          : plugin.origin === "config"
            ? 20
            : 10;
    } else {
      originScore = plugin.origin === "bundled"
        ? 40
        : plugin.origin === "workspace"
          ? 30
          : plugin.origin === "global"
            ? 20
            : 10;
    }

    return statusScore + originScore;
  };

  const discoveredById = new Map<string, ReturnType<typeof buildPluginStatusReport>["plugins"][number]>();
  for (const plugin of discoveredPlugins) {
    const existing = discoveredById.get(plugin.id);
    if (!existing) {
      discoveredById.set(plugin.id, plugin);
      continue;
    }

    if (readPluginPriority(plugin) > readPluginPriority(existing)) {
      discoveredById.set(plugin.id, plugin);
    }
  }

  for (const plugin of discoveredById.values()) {
    const installRecord = pluginRecordsMap[plugin.id];
    const entry = pluginEntries[plugin.id];
    const normalizedSpec = resolvePluginCanonicalSpec({
      pluginId: plugin.id,
      installSpec: installRecord?.spec
    });
    const enabled = entry?.enabled === false ? false : plugin.enabled;
    const runtimeStatus = entry?.enabled === false ? "disabled" : plugin.status;

    pluginRecords.push({
      type: "plugin",
      id: plugin.id,
      spec: normalizedSpec,
      label: plugin.name && plugin.name.trim().length > 0 ? plugin.name : plugin.id,
      source: plugin.source,
      installedAt: installRecord?.installedAt,
      enabled,
      runtimeStatus,
      origin: plugin.origin,
      installPath: installRecord?.installPath
    });
    seenPluginIds.add(plugin.id);
  }

  for (const [pluginId, installRecord] of Object.entries(pluginRecordsMap)) {
    if (seenPluginIds.has(pluginId)) {
      continue;
    }

    const normalizedSpec = resolvePluginCanonicalSpec({
      pluginId,
      installSpec: installRecord.spec
    });
    const entry = pluginEntries[pluginId];
    pluginRecords.push({
      type: "plugin",
      id: pluginId,
      spec: normalizedSpec,
      label: pluginId,
      source: installRecord.source,
      installedAt: installRecord.installedAt,
      enabled: entry?.enabled !== false,
      runtimeStatus: entry?.enabled === false ? "disabled" : "unresolved",
      installPath: installRecord.installPath
    });
    seenPluginIds.add(pluginId);
  }

  for (const [pluginId, entry] of Object.entries(pluginEntries)) {
    if (!seenPluginIds.has(pluginId)) {
      const normalizedSpec = resolvePluginCanonicalSpec({ pluginId });
      pluginRecords.push({
        type: "plugin",
        id: pluginId,
        spec: normalizedSpec,
        label: pluginId,
        source: "config",
        enabled: entry?.enabled !== false,
        runtimeStatus: entry?.enabled === false ? "disabled" : "unresolved"
      });
      seenPluginIds.add(pluginId);
    }
  }

  const dedupedPluginRecords = dedupeInstalledPluginRecordsByCanonicalSpec(pluginRecords);
  dedupedPluginRecords.sort((left, right) => {
    return left.spec.localeCompare(right.spec);
  });

  return {
    specs: dedupedPluginRecords.map((record) => record.spec),
    records: dedupedPluginRecords
  };
}

export function collectInstalledSkillRecords(options: UiRouterOptions): {
  records: MarketplaceInstalledRecord[];
  specs: string[];
} {
  const config = loadConfigOrDefault(options.configPath);
  const workspacePath = getWorkspacePathFromConfig(config);
  const skillsLoader = createSkillsLoader(workspacePath);
  const availableSkillSet = new Set((skillsLoader?.listSkills(true) ?? []).map((skill) => skill.name));
  const listedSkills = skillsLoader?.listSkills(false) ?? [];

  const records = listedSkills
    .map((skill) => {
      const enabled = availableSkillSet.has(skill.name);
      const metadata = skillsLoader?.getSkillMetadata?.(skill.name);
      const description = readNonEmptyString(metadata?.description);
      const descriptionZh =
        readNonEmptyString(metadata?.description_zh) ??
        readNonEmptyString(metadata?.descriptionZh) ??
        readNonEmptyString(MARKETPLACE_ZH_COPY_BY_SLUG[skill.name]?.description);
      return {
        type: "skill",
        id: skill.name,
        spec: skill.name,
        label: skill.name,
        ...(description ? { description } : {}),
        ...(descriptionZh ? { descriptionZh } : {}),
        source: skill.source,
        enabled,
        runtimeStatus: enabled ? "enabled" : "disabled"
      } satisfies MarketplaceInstalledRecord;
    })
    .sort((left, right) => left.spec.localeCompare(right.spec));

  return {
    specs: records.map((record) => record.spec),
    records
  };
}

export function collectPluginMarketplaceInstalledView(options: UiRouterOptions): MarketplaceInstalledView {
  const installed = collectInstalledPluginRecords(options);
  return {
    type: "plugin",
    total: installed.records.length,
    specs: installed.specs,
    records: installed.records
  };
}

export function collectSkillMarketplaceInstalledView(options: UiRouterOptions): MarketplaceInstalledView {
  const installed = collectInstalledSkillRecords(options);
  return {
    type: "skill",
    total: installed.records.length,
    specs: installed.specs,
    records: installed.records
  };
}

export function resolvePluginManageTargetId(options: UiRouterOptions, rawTargetId: string, rawSpec?: string): string {
  const targetId = rawTargetId.trim();
  if (!targetId && !rawSpec) {
    return rawTargetId;
  }

  const normalizedTarget = targetId ? normalizePluginNpmSpec(targetId).toLowerCase() : "";
  const normalizedSpec = rawSpec ? normalizePluginNpmSpec(rawSpec).toLowerCase() : "";
  const pluginRecords = collectInstalledPluginRecords(options).records;
  const lowerTargetId = targetId.toLowerCase();

  for (const record of pluginRecords) {
    const recordId = record.id?.trim();
    if (recordId && recordId.toLowerCase() === lowerTargetId) {
      return recordId;
    }
  }

  if (normalizedTarget) {
    for (const record of pluginRecords) {
      const normalizedRecordSpec = normalizePluginNpmSpec(record.spec).toLowerCase();
      if (normalizedRecordSpec === normalizedTarget && record.id && record.id.trim().length > 0) {
        return record.id;
      }
    }
  }

  if (normalizedSpec && normalizedSpec !== normalizedTarget) {
    for (const record of pluginRecords) {
      const normalizedRecordSpec = normalizePluginNpmSpec(record.spec).toLowerCase();
      if (normalizedRecordSpec === normalizedSpec && record.id && record.id.trim().length > 0) {
        return record.id;
      }
    }
  }

  return targetId || rawSpec || rawTargetId;
}

export function collectKnownSkillNames(options: UiRouterOptions): Set<string> {
  const config = loadConfigOrDefault(options.configPath);
  const loader = createSkillsLoader(getWorkspacePathFromConfig(config));
  return new Set((loader?.listSkills(false) ?? []).map((skill) => skill.name));
}

export function isSupportedMarketplacePluginItem(item: MarketplaceItemView | MarketplaceListView["items"][number]): boolean {
  return item.type === "plugin" && item.install.kind === "npm" && isSupportedMarketplacePluginSpec(item.install.spec);
}

export function isSupportedMarketplaceSkillItem(
  item: MarketplaceItemView | MarketplaceListView["items"][number],
  knownSkillNames: Set<string>
): boolean {
  if (item.type !== "skill") {
    return false;
  }

  if (item.install.kind === "marketplace") {
    return true;
  }

  return item.install.kind === "builtin" && knownSkillNames.has(item.install.spec);
}

export function findUnsupportedSkillInstallKind(
  items: Array<MarketplaceItemView | MarketplaceListView["items"][number]>
): string | null {
  for (const item of items) {
    if (item.type !== "skill") {
      continue;
    }
    const kind = item.install.kind as string;
    if (kind !== "builtin" && kind !== "marketplace") {
      return kind;
    }
  }
  return null;
}
