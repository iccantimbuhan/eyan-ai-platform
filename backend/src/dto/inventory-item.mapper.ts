import type { Ingredient, InventoryItem, Unit } from "../generated/prisma/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { InventoryItemResponseDto, StockStatus } from "./inventory-item.dto.js";

type InventoryItemWithRefs = InventoryItem & { ingredient: Ingredient; unit: Unit };

// The one place stock status is computed — never stored, never
// recomputed differently on the frontend. Matches the spec's own formula
// exactly: quantity > minimum -> IN_STOCK; 0 < quantity <= minimum ->
// LOW_STOCK; quantity <= 0 -> OUT_OF_STOCK.
export function computeStockStatus(
  currentQuantity: Prisma.Decimal,
  minimumQuantity: Prisma.Decimal
): StockStatus {
  if (currentQuantity.lte(0)) return "OUT_OF_STOCK";
  if (currentQuantity.lte(minimumQuantity)) return "LOW_STOCK";
  return "IN_STOCK";
}

// Decimal -> string boundary conversion happens only here, same convention
// as recipe-ingredient.mapper.ts: .toFixed(2).
export function mapInventoryItemToResponse(row: InventoryItemWithRefs): InventoryItemResponseDto {
  return {
    id: row.id,
    branchId: row.branchId,
    restaurantId: row.restaurantId,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    unitId: row.unitId,
    unitAbbreviation: row.unit.abbreviation,
    currentQuantity: row.currentQuantity.toFixed(2),
    minimumQuantity: row.minimumQuantity.toFixed(2),
    status: computeStockStatus(row.currentQuantity, row.minimumQuantity),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
