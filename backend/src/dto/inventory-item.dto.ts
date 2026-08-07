export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface CreateInventoryItemDto {
  ingredientId: string;
  unitId: string;
  openingQuantity: number | string;
  minimumQuantity: number | string;
  reason?: string;
}

export interface UpdateInventoryItemDto {
  minimumQuantity: number | string;
}

export interface InventoryItemResponseDto {
  id: string;
  branchId: string;
  restaurantId: string;
  ingredientId: string;
  ingredientName: string;
  unitId: string;
  unitAbbreviation: string;
  currentQuantity: string;
  minimumQuantity: string;
  status: StockStatus;
  createdAt: Date;
  updatedAt: Date;
}
