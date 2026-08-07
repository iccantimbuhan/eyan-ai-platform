import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { StockMovementType } from "../generated/prisma/enums.js";

const includeRefs = { ingredient: true, unit: true } as const;

export interface CreateInventoryItemData {
  branchId: string;
  restaurantId: string;
  ingredientId: string;
  unitId: string;
  openingQuantity: Prisma.Decimal | string | number;
  minimumQuantity: Prisma.Decimal | string | number;
  reason?: string | null;
  createdById: string;
}

export interface UpdateInventoryItemData {
  minimumQuantity?: Prisma.Decimal | string | number;
}

export class InventoryItemRepository {
  async findById(id: string) {
    return prisma.inventoryItem.findUnique({ where: { id }, include: includeRefs });
  }

  async findByBranchAndIngredient(branchId: string, ingredientId: string) {
    return prisma.inventoryItem.findUnique({
      where: { branchId_ingredientId: { branchId, ingredientId } },
    });
  }

  async findManyByBranchId(branchId: string) {
    return prisma.inventoryItem.findMany({
      where: { branchId },
      include: includeRefs,
      orderBy: { ingredient: { name: "asc" } },
    });
  }

  // Creates the InventoryItem (currentQuantity = openingQuantity) and its
  // first OPENING_STOCK StockMovement in one transaction — opening stock is
  // only ever recorded this way, at item creation, so the two rows can
  // never disagree and the "opening stock must be an auditable movement"
  // rule is structural, not a convention someone could forget to follow.
  async createWithOpeningStock(data: CreateInventoryItemData) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          branchId: data.branchId,
          restaurantId: data.restaurantId,
          ingredientId: data.ingredientId,
          unitId: data.unitId,
          currentQuantity: data.openingQuantity,
          minimumQuantity: data.minimumQuantity,
        },
        include: includeRefs,
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          branchId: data.branchId,
          unitId: data.unitId,
          type: "OPENING_STOCK" as StockMovementType,
          quantityDelta: data.openingQuantity,
          quantityAfter: data.openingQuantity,
          reason: data.reason,
          createdById: data.createdById,
        },
      });

      return item;
    });
  }

  async update(id: string, data: UpdateInventoryItemData) {
    return prisma.inventoryItem.update({
      where: { id },
      data: { minimumQuantity: data.minimumQuantity },
      include: includeRefs,
    });
  }

  // Only ever called from stock-movement.repository.ts inside the same
  // transaction as the StockMovement insert that justifies the change —
  // never called standalone, so currentQuantity can never drift from the
  // movement ledger.
  async updateCurrentQuantity(
    id: string,
    currentQuantity: Prisma.Decimal | string | number,
    tx: Prisma.TransactionClient
  ) {
    return tx.inventoryItem.update({
      where: { id },
      data: { currentQuantity },
      include: includeRefs,
    });
  }
}

export const inventoryItemRepository = new InventoryItemRepository();
