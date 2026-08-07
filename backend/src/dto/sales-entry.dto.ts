export interface CreateSalesChannelEntryDto {
  salesChannelId: string;
  amount: number | string;
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
}
