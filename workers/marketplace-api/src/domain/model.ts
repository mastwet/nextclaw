export const MARKETPLACE_ITEM_TYPES = ["plugin", "skill"] as const;

export type MarketplaceItemType = (typeof MARKETPLACE_ITEM_TYPES)[number];

export type MarketplaceSort = "relevance" | "updated";

export type MarketplacePluginInstallKind = "npm";
export type MarketplaceSkillInstallKind = "builtin" | "marketplace";
export type MarketplaceInstallKind = MarketplacePluginInstallKind | MarketplaceSkillInstallKind;

export type MarketplacePluginInstallSpec = {
  kind: MarketplacePluginInstallKind;
  spec: string;
  command: string;
};

export type MarketplaceSkillInstallSpec = {
  kind: MarketplaceSkillInstallKind;
  spec: string;
  command: string;
};

export type MarketplaceInstallSpec = MarketplacePluginInstallSpec | MarketplaceSkillInstallSpec;

export type LocalizedTextMap = Record<string, string>;

type MarketplaceItemBase = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  summaryI18n: LocalizedTextMap;
  description?: string;
  descriptionI18n?: LocalizedTextMap;
  tags: string[];
  author: string;
  sourceRepo?: string;
  homepage?: string;
  publishedAt: string;
  updatedAt: string;
};

export type MarketplacePluginItem = MarketplaceItemBase & {
  type: "plugin";
  install: MarketplacePluginInstallSpec;
};

export type MarketplaceSkillItem = MarketplaceItemBase & {
  type: "skill";
  install: MarketplaceSkillInstallSpec;
};

export type MarketplaceItem = MarketplacePluginItem | MarketplaceSkillItem;

export type MarketplaceRecommendationScene = {
  id: string;
  title: string;
  description?: string;
  itemIds: string[];
};

export type MarketplaceCatalogSection = {
  items: MarketplaceItem[];
  recommendations: MarketplaceRecommendationScene[];
};

export type MarketplaceListQuery = {
  q?: string;
  tag?: string;
  page: number;
  pageSize: number;
  sort: MarketplaceSort;
};

type MarketplaceItemSummaryBase = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  summaryI18n: LocalizedTextMap;
  tags: string[];
  author: string;
  updatedAt: string;
};

export type MarketplacePluginItemSummary = MarketplaceItemSummaryBase & {
  type: "plugin";
  install: MarketplacePluginInstallSpec;
};

export type MarketplaceSkillItemSummary = MarketplaceItemSummaryBase & {
  type: "skill";
  install: MarketplaceSkillInstallSpec;
};

export type MarketplaceItemSummary = MarketplacePluginItemSummary | MarketplaceSkillItemSummary;

export type MarketplaceListResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: MarketplaceSort;
  query?: string;
  items: MarketplaceItemSummary[];
};

export type MarketplaceRecommendationResult = {
  type: MarketplaceItemType;
  sceneId: string;
  title: string;
  description?: string;
  total: number;
  items: MarketplaceItemSummary[];
};
