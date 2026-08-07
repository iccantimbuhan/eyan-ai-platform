export interface CreateSalesChannelEntryDto {
  salesChannelId: string;
  amount: number | string;
  // POS Source / Sales Channel Flexibility — optional, which POS terminal
  // reported this channel's amount for this day. Never a fixed mapping;
  // see SalesChannelEntry.posSourceId's schema comment.
  posSourceId?: string;
  transactionCount?: number;
}

export interface CreateSalesPaymentMethodEntryDto {
  salesPaymentMethodId: string;
  amount: number | string;
  transactionCount?: number;
}

export interface CreateSalesCategoryEntryDto {
  salesCategoryId: string;
  quantity?: number | string;
  amount: number | string;
}

export interface CreateSalesItemEntryDto {
  menuItemId?: string;
  itemName: string;
  categoryName?: string;
  quantity: number | string;
  amount: number | string;
  // POS-reported %QT/%SALE — see SalesItemEntry's schema comment. Never
  // confused with Sprint 2D's computed analytics percentages.
  posQuantityPercent?: number | string;
  posSalesPercent?: number | string;
}
