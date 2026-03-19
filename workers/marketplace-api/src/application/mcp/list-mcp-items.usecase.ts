import type { MarketplaceListQuery, MarketplaceListResult } from "../../domain/model";
import type { McpRepository } from "../../domain/mcp-repository";

export class ListMcpItemsUseCase {
  constructor(private readonly repository: McpRepository) {}

  async execute(query: MarketplaceListQuery): Promise<MarketplaceListResult> {
    return this.repository.listItems(query);
  }
}
