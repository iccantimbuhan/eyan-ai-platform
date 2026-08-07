import {
  salesChannelMenuItemRepository,
  SalesChannelMenuItemRepository,
} from "../repositories/sales-channel-menu-item.repository.js";
import {
  salesChannelRepository as defaultSalesChannelRepository,
  SalesChannelRepository,
} from "../repositories/sales-reference.repository.js";
import { menuItemRepository as defaultMenuItemRepository, MenuItemRepository } from "../repositories/menu-item.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { SalesScopeMismatchError } from "../errors/sales.error.js";
import { mapSalesChannelMenuItemToResponse } from "../dto/sales-channel-menu-item.mapper.js";
import type { UpsertSalesChannelMenuItemDto } from "../dto/sales-channel-menu-item.dto.js";

// Sprint 2B Prep — purely a reference/catalog table. Never touches
// MenuItem.price, SalesItemEntry, or any other historical sales row; it
// only supplies an optional per-channel price default the Daily Sales item
// entry form can read as a convenience (see sales-aggregation-adjacent
// reasoning in schema.prisma's own comment on the model).
export class SalesChannelMenuItemService {
  constructor(
    private readonly repository: SalesChannelMenuItemRepository = salesChannelMenuItemRepository,
    private readonly salesChannelRepository: SalesChannelRepository = defaultSalesChannelRepository,
    private readonly menuItemRepository: MenuItemRepository = defaultMenuItemRepository
  ) {}

  async listByRestaurant(restaurantId: string) {
    const rows = await this.repository.findManyByRestaurantId(restaurantId);
    return rows.map(mapSalesChannelMenuItemToResponse);
  }

  // menuItemId's restaurant is already authorized by requireMenuItemAccess
  // at the route level; salesChannelId is client-supplied and re-verified
  // here against that same restaurant, mirroring every other Sales
  // Foundation scope check (SalesScopeMismatchError).
  private async resolveMenuItemRestaurant(menuItemId: string) {
    const menuItem = await this.menuItemRepository.findById(menuItemId);

    if (!menuItem) {
      throw new NotFoundError("Menu item not found.");
    }

    return menuItem.restaurantId;
  }

  private async assertChannelBelongsToRestaurant(restaurantId: string, salesChannelId: string) {
    const channel = await this.salesChannelRepository.findById(salesChannelId);

    if (!channel || channel.restaurantId !== restaurantId) {
      throw new SalesScopeMismatchError("This sales channel does not belong to the menu item's restaurant.");
    }
  }

  async upsert(menuItemId: string, salesChannelId: string, data: UpsertSalesChannelMenuItemDto) {
    const restaurantId = await this.resolveMenuItemRestaurant(menuItemId);
    await this.assertChannelBelongsToRestaurant(restaurantId, salesChannelId);

    const row = await this.repository.upsert(restaurantId, salesChannelId, menuItemId, {
      price: data.price,
      available: data.available,
    });

    return mapSalesChannelMenuItemToResponse(row);
  }

  async remove(menuItemId: string, salesChannelId: string) {
    const restaurantId = await this.resolveMenuItemRestaurant(menuItemId);
    await this.assertChannelBelongsToRestaurant(restaurantId, salesChannelId);

    const existing = await this.repository.findByChannelAndMenuItem(salesChannelId, menuItemId);
    if (!existing) {
      throw new NotFoundError("No channel price override exists for this menu item on this channel.");
    }

    await this.repository.delete(salesChannelId, menuItemId);
  }
}

export const salesChannelMenuItemService = new SalesChannelMenuItemService();
