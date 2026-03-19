import type { MarketplaceItem, MarketplaceListQuery, MarketplaceListResult, MarketplaceRecommendationResult } from "./model";

export interface McpRepository {
  listItems(query: MarketplaceListQuery): Promise<MarketplaceListResult>;
  getItemBySlug(slug: string): Promise<MarketplaceItem | null>;
  listRecommendations(sceneId: string | undefined, limit: number): Promise<MarketplaceRecommendationResult>;
}
