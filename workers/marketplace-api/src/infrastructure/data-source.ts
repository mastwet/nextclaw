import type { MarketplaceCatalogSection } from "../domain/model";
import type { MarketplaceSectionDataSource } from "../domain/repository";

export abstract class BaseMarketplaceDataSource implements MarketplaceSectionDataSource {
  abstract loadSection(): Promise<MarketplaceCatalogSection>;
}
