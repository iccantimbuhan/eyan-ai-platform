export interface UpsertSalesChannelMenuItemDto {
  price?: number | string | null;
  available?: boolean;
}

// price is null when this channel has no override — the caller falls back
// to the MenuItem's own base price, never duplicated onto this row.
export interface SalesChannelMenuItemResponseDto {
  id: string;
  restaurantId: string;
  salesChannelId: string;
  channelName: string;
  menuItemId: string;
  price: string | null;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}
