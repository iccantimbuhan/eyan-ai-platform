import { describe, expect, it, vi } from "vitest";

import { StockMovementService } from "./stock-movement.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { Prisma } from "../generated/prisma/client.js";

// currentQuantity needs to be a real Prisma.Decimal (not a duck-typed
// fake) because the service does real arithmetic on it (.plus/.minus/
// .abs/.negated), unlike recipe-ingredient.service.test.ts's quantity
// field, which is only ever read via .toFixed() in the mapper.
function itemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    branchId: "branch-1",
    unitId: "unit-1",
    currentQuantity: new Prisma.Decimal("5.00"),
    minimumQuantity: new Prisma.Decimal("2.00"),
    ...overrides,
  };
}

function movementRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "movement-1",
    inventoryItemId: "item-1",
    branchId: "branch-1",
    unitId: "unit-1",
    unit: { abbreviation: "kg" },
    type: "ADJUSTMENT",
    quantityDelta: new Prisma.Decimal("-0.50"),
    quantityAfter: new Prisma.Decimal("4.50"),
    reason: "Damaged product",
    createdById: "user-1",
    createdBy: { name: "Test Manager" },
    createdAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    record: vi.fn().mockResolvedValue(movementRow()),
    findManyByInventoryItemId: vi.fn().mockResolvedValue([movementRow()]),
    ...overrides,
  };
}

function createInventoryItemRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(itemRow()), ...overrides };
}

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  inventoryItemRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new StockMovementService(
    createRepository(overrides.repository) as never,
    createInventoryItemRepository(overrides.inventoryItemRepository) as never
  );
}

describe("StockMovementService", () => {
  it("list() 404s when the inventory item doesn't exist", async () => {
    const service = buildService({
      inventoryItemRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.list("missing")).rejects.toThrow(NotFoundError);
  });

  it("list() delegates to the repository by inventoryItemId", async () => {
    const repository = createRepository();
    const service = new StockMovementService(
      repository as never,
      createInventoryItemRepository() as never
    );

    await service.list("item-1");

    expect(repository.findManyByInventoryItemId).toHaveBeenCalledWith("item-1");
  });

  // The spec's own worked example: 5.20kg on hand, -0.50kg adjustment,
  // "Damaged product" -> 4.70kg. Using 5.00 here for round numbers.
  it("recordAdjustment() applies the signed delta to currentQuantity", async () => {
    const repository = createRepository();
    const inventoryItemRepository = createInventoryItemRepository({
      findById: vi.fn().mockResolvedValue(itemRow({ currentQuantity: new Prisma.Decimal("5.00") })),
    });
    const service = new StockMovementService(repository as never, inventoryItemRepository as never);

    await service.recordAdjustment(
      "item-1",
      { quantityDelta: -0.5, reason: "Damaged product" },
      "user-1"
    );

    const call = repository.record.mock.calls[0][0];
    expect(call.type).toBe("ADJUSTMENT");
    expect(call.quantityDelta.toFixed(2)).toBe("-0.50");
    expect(call.quantityAfter.toFixed(2)).toBe("4.50");
    expect(call.reason).toBe("Damaged product");
    expect(call.createdById).toBe("user-1");
  });

  it("recordAdjustment() allows driving currentQuantity negative — surfaces the discrepancy rather than clamping it", async () => {
    const repository = createRepository();
    const inventoryItemRepository = createInventoryItemRepository({
      findById: vi.fn().mockResolvedValue(itemRow({ currentQuantity: new Prisma.Decimal("3.00") })),
    });
    const service = new StockMovementService(repository as never, inventoryItemRepository as never);

    await service.recordAdjustment("item-1", { quantityDelta: -5, reason: "Count correction" }, "user-1");

    const call = repository.record.mock.calls[0][0];
    expect(call.quantityAfter.toFixed(2)).toBe("-2.00");
  });

  it("recordAdjustment() 404s when the inventory item doesn't exist", async () => {
    const repository = createRepository();
    const service = new StockMovementService(
      repository as never,
      createInventoryItemRepository({ findById: vi.fn().mockResolvedValue(null) }) as never
    );

    await expect(
      service.recordAdjustment("missing", { quantityDelta: -1, reason: "x" }, "user-1")
    ).rejects.toThrow(NotFoundError);
    expect(repository.record).not.toHaveBeenCalled();
  });

  // The spec's own worked example: Lettuce, 0.50kg wasted (client supplies
  // a positive amount; the service negates it).
  it("recordWaste() negates the client-supplied positive quantity", async () => {
    const repository = createRepository();
    const inventoryItemRepository = createInventoryItemRepository({
      findById: vi.fn().mockResolvedValue(itemRow({ currentQuantity: new Prisma.Decimal("2.00") })),
    });
    const service = new StockMovementService(repository as never, inventoryItemRepository as never);

    await service.recordWaste("item-1", { quantity: 0.5, reason: "Spoiled" }, "user-1");

    const call = repository.record.mock.calls[0][0];
    expect(call.type).toBe("WASTE");
    expect(call.quantityDelta.toFixed(2)).toBe("-0.50");
    expect(call.quantityAfter.toFixed(2)).toBe("1.50");
  });

  // The spec's own worked example: system 5.20kg, physical count 4.80kg,
  // difference -0.40kg. Client supplies the absolute counted quantity; the
  // service computes the signed delta.
  it("recordStockCount() computes the delta against the current system quantity", async () => {
    const repository = createRepository();
    const inventoryItemRepository = createInventoryItemRepository({
      findById: vi.fn().mockResolvedValue(itemRow({ currentQuantity: new Prisma.Decimal("5.20") })),
    });
    const service = new StockMovementService(repository as never, inventoryItemRepository as never);

    await service.recordStockCount("item-1", { countedQuantity: 4.8 }, "user-1");

    const call = repository.record.mock.calls[0][0];
    expect(call.type).toBe("STOCK_COUNT");
    expect(call.quantityDelta.toFixed(2)).toBe("-0.40");
    expect(call.quantityAfter.toFixed(2)).toBe("4.80");
  });

  it("recordStockCount() computes a positive delta when the physical count exceeds the system quantity", async () => {
    const repository = createRepository();
    const inventoryItemRepository = createInventoryItemRepository({
      findById: vi.fn().mockResolvedValue(itemRow({ currentQuantity: new Prisma.Decimal("2.00") })),
    });
    const service = new StockMovementService(repository as never, inventoryItemRepository as never);

    await service.recordStockCount("item-1", { countedQuantity: 3.5 }, "user-1");

    const call = repository.record.mock.calls[0][0];
    expect(call.quantityDelta.toFixed(2)).toBe("1.50");
    expect(call.quantityAfter.toFixed(2)).toBe("3.50");
  });
});
