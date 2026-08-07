export interface CreateAdjustmentDto {
  quantityDelta: number | string;
  reason: string;
}

export interface CreateWasteDto {
  quantity: number | string;
  reason: string;
}

export interface CreateStockCountDto {
  countedQuantity: number | string;
  reason?: string;
}

export interface StockMovementResponseDto {
  id: string;
  inventoryItemId: string;
  branchId: string;
  unitId: string;
  unitAbbreviation: string;
  type: string;
  quantityDelta: string;
  quantityAfter: string;
  reason: string | null;
  createdById: string;
  createdByName: string;
  createdAt: Date;
}
