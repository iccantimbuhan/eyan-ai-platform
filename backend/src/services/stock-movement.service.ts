import {
  stockMovementRepository,
  StockMovementRepository,
} from "../repositories/stock-movement.repository.js";
import {
  inventoryItemRepository as defaultInventoryItemRepository,
  InventoryItemRepository,
} from "../repositories/inventory-item.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapStockMovementToResponse } from "../dto/stock-movement.mapper.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
  CreateAdjustmentDto,
  CreateStockCountDto,
  CreateWasteDto,
} from "../dto/stock-movement.dto.js";

export class StockMovementService {
  constructor(
    private readonly repository: StockMovementRepository = stockMovementRepository,
    private readonly inventoryItemRepository: InventoryItemRepository = defaultInventoryItemRepository
  ) {}

  private async getItemOrThrow(inventoryItemId: string) {
    const item = await this.inventoryItemRepository.findById(inventoryItemId);

    if (!item) {
      throw new NotFoundError("Inventory item not found.");
    }

    return item;
  }

  async list(inventoryItemId: string) {
    await this.getItemOrThrow(inventoryItemId);

    const movements = await this.repository.findManyByInventoryItemId(inventoryItemId);
    return movements.map(mapStockMovementToResponse);
  }

  // Client supplies a signed delta directly (e.g. -0.50). Allowed to drive
  // currentQuantity negative — see ADR-0038: clamping at zero would hide a
  // real discrepancy (e.g. a missing opening-stock entry) instead of
  // surfacing it.
  async recordAdjustment(inventoryItemId: string, data: CreateAdjustmentDto, createdById: string) {
    const item = await this.getItemOrThrow(inventoryItemId);

    const delta = new Prisma.Decimal(data.quantityDelta);
    const quantityAfter = item.currentQuantity.plus(delta);

    const movement = await this.repository.record({
      inventoryItemId,
      branchId: item.branchId,
      unitId: item.unitId,
      type: "ADJUSTMENT",
      quantityDelta: delta,
      quantityAfter,
      reason: data.reason,
      createdById,
    });

    return mapStockMovementToResponse(movement);
  }

  // Client supplies a positive amount wasted; the service negates it so the
  // caller never has to think in signed deltas for what is conceptually
  // always a decrease.
  async recordWaste(inventoryItemId: string, data: CreateWasteDto, createdById: string) {
    const item = await this.getItemOrThrow(inventoryItemId);

    const delta = new Prisma.Decimal(data.quantity).abs().negated();
    const quantityAfter = item.currentQuantity.plus(delta);

    const movement = await this.repository.record({
      inventoryItemId,
      branchId: item.branchId,
      unitId: item.unitId,
      type: "WASTE",
      quantityDelta: delta,
      quantityAfter,
      reason: data.reason,
      createdById,
    });

    return mapStockMovementToResponse(movement);
  }

  // Client supplies the absolute physical count; the service computes the
  // signed delta against the current system quantity.
  async recordStockCount(inventoryItemId: string, data: CreateStockCountDto, createdById: string) {
    const item = await this.getItemOrThrow(inventoryItemId);

    const countedQuantity = new Prisma.Decimal(data.countedQuantity);
    const delta = countedQuantity.minus(item.currentQuantity);

    const movement = await this.repository.record({
      inventoryItemId,
      branchId: item.branchId,
      unitId: item.unitId,
      type: "STOCK_COUNT",
      quantityDelta: delta,
      quantityAfter: countedQuantity,
      reason: data.reason,
      createdById,
    });

    return mapStockMovementToResponse(movement);
  }
}

export const stockMovementService = new StockMovementService();
