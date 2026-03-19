import type { MarketplaceItem } from "../../domain/model";
import { ResourceNotFoundError } from "../../domain/errors";
import type { McpRepository } from "../../domain/mcp-repository";

export class GetMcpItemUseCase {
  constructor(private readonly repository: McpRepository) {}

  async execute(slug: string): Promise<MarketplaceItem> {
    const item = await this.repository.getItemBySlug(slug);
    if (!item) {
      throw new ResourceNotFoundError(`mcp item not found: ${slug}`);
    }
    return item;
  }
}
