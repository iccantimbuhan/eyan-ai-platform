import { prisma } from "../lib/prisma.js";
import { inventoryItemRepository } from "./inventory-item.repository.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { StockMovementType } from "../generated/prisma/enums.js";

export interface RecordMovementData {
  inventoryItemId: string;
  branchId: string;
  unitId: string;
  type: StockMovementType;
  quantityDelta: Prisma.Decimal | string | number;
  quantityAfter: Prisma.Decimal | string | number;
  reason?: string | null;
  createdById: string;
}

export class StockMovementRepository {
  // Inserts the StockMovement row and updates the parent InventoryItem's
  // currentQuantity in one transaction, so the running balance can never
  // disagree with the ledger — this is the only place either table is
  // written when recording a movement (see inventory-item.repository.ts's
  // updateCurrentQuantity comment).
  async record(data: RecordMovementData) {
    return prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          branchId: data.branchId,
          unitId: data.unitId,
          type: data.type,
          quantityDelta: data.quantityDelta,
          quantityAfter: data.quantityAfter,
          reason: data.reason,
          createdById: data.createdById,
        },
        include: { unit: true, createdBy: true },
      });

      await inventoryItemRepository.updateCurrentQuantity(
        data.inventoryItemId,
        data.quantityAfter,
        tx
      );

      return movement;
    });
  }

  async findManyByInventoryItemId(inventoryItemId: string) {
    return prisma.stockMovement.findMany({
      where: { inventoryItemId },
      include: { unit: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const stockMovementRepository = new StockMovementRepository();
