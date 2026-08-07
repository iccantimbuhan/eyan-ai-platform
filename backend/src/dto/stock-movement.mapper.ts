import type { StockMovement, Unit, User } from "../generated/prisma/client.js";
import type { StockMovementResponseDto } from "./stock-movement.dto.js";

type StockMovementWithRefs = StockMovement & { unit: Unit; createdBy: User };

// Decimal -> string boundary conversion happens only here, same convention
// as inventory-item.mapper.ts / recipe-ingredient.mapper.ts: .toFixed(2).
export function mapStockMovementToResponse(row: StockMovementWithRefs): StockMovementResponseDto {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    branchId: row.branchId,
    unitId: row.unitId,
    unitAbbreviation: row.unit.abbreviation,
    type: row.type,
    quantityDelta: row.quantityDelta.toFixed(2),
    quantityAfter: row.quantityAfter.toFixed(2),
    reason: row.reason,
    createdById: row.createdById,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt,
  };
}
