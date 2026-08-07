import type { SalesChannelMenuItemWithChannel } from "../repositories/sales-channel-menu-item.repository.js";
import type { SalesChannelMenuItemResponseDto } from "./sales-channel-menu-item.dto.js";

export function mapSalesChannelMenuItemToResponse(
  row: SalesChannelMenuItemWithChannel
): SalesChannelMenuItemResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    salesChannelId: row.salesChannelId,
    channelName: row.salesChannel.name,
    menuItemId: row.menuItemId,
    price: row.price ? row.price.toFixed(2) : null,
    available: row.available,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
