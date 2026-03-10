import type { MarketplaceCatalogSection } from "./model";

export type MarketplaceSectionDataSource = {
  loadSection(): Promise<MarketplaceCatalogSection>;
};
