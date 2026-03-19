import type { MarketplaceRecommendationResult } from "../../domain/model";
import type { McpRepository } from "../../domain/mcp-repository";

export class ListMcpRecommendationsUseCase {
  constructor(private readonly repository: McpRepository) {}

  async execute(sceneId: string | undefined, limit: number): Promise<MarketplaceRecommendationResult> {
    return this.repository.listRecommendations(sceneId, limit);
  }
}
