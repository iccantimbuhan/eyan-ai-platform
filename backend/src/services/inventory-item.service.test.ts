import { describe, expect, it, vi } from "vitest";

import { InventoryItemService } from "./inventory-item.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  InventoryItemAlreadyExistsError,
  InventoryScopeMismatchError,
} from "../errors/inventory.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value, lte: (other: number) => Number(value) <= other };
}

function itemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    branchId: "branch-1",
    restaurantId: "rest-1",
    ingredientId: "ing-1",
    ingredient: { name: "Mozzarella" },
    unitId: "unit-1",
    unit: { abbreviation: "kg" },
    currentQuantity: decimal("5.00"),
    minimumQuantity: decimal("2.00"),
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function branchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "branch-1", restaurantId: "rest-1", ...overrides };
}

function ingredientRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "ing-1", restaurantId: "rest-1", name: "Mozzarella", ...overrides };
}

function unitRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "unit-1", restaurantId: "rest-1", abbreviation: "kg", ...overrides };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(itemRow()),
    findByBranchAndIngredient: vi.fn().mockResolvedValue(null),
    findManyByBranchId: vi.fn().mockResolvedValue([itemRow()]),
    createWithOpeningStock: vi.fn().mockResolvedValue(itemRow()),
    update: vi.fn().mockResolvedValue(itemRow({ minimumQuantity: decimal("3.00") })),
    ...overrides,
  };
}

function createBranchRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(branchRow()), ...overrides };
}

function createIngredientRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(ingredientRow()), ...overrides };
}

function createUnitRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(unitRow()), ...overrides };
}

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  branchRepository?: Partial<Record<string, unknown>>;
  ingredientRepository?: Partial<Record<string, unknown>>;
  unitRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new InventoryItemService(
    createRepository(overrides.repository) as never,
    createBranchRepository(overrides.branchRepository) as never,
    createIngredientRepository(overrides.ingredientRepository) as never,
    createUnitRepository(overrides.unitRepository) as never
  );
}

describe("InventoryItemService", () => {
  it("list() delegates to the repository by branchId", async () => {
    const repository = createRepository();
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await service.list("branch-1");

    expect(repository.findManyByBranchId).toHaveBeenCalledWith("branch-1");
  });

  it("getById() throws NotFoundError when the item doesn't exist", async () => {
    const service = buildService({ repository: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() persists opening stock whose ingredient and unit belong to the branch's restaurant", async () => {
    const repository = createRepository();
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await service.create(
      "branch-1",
      { ingredientId: "ing-1", unitId: "unit-1", openingQuantity: 5, minimumQuantity: 2 },
      "user-1"
    );

    expect(repository.createWithOpeningStock).toHaveBeenCalledWith({
      branchId: "branch-1",
      restaurantId: "rest-1",
      ingredientId: "ing-1",
      unitId: "unit-1",
      openingQuantity: 5,
      minimumQuantity: 2,
      reason: null,
      createdById: "user-1",
    });
  });

  it("create() throws NotFoundError when the branch doesn't exist", async () => {
    const service = buildService({ branchRepository: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(
      service.create(
        "missing-branch",
        { ingredientId: "ing-1", unitId: "unit-1", openingQuantity: 5, minimumQuantity: 2 },
        "user-1"
      )
    ).rejects.toThrow(NotFoundError);
  });

  // Defense-in-depth mirroring RecipeIngredientService: branchId is
  // authorized by requireBranchAccess at the route, but ingredientId/unitId
  // are client-supplied and could point at rows under a different
  // Restaurant than the one that owns this Branch.
  it("create() throws InventoryScopeMismatchError when the ingredient belongs to a different restaurant", async () => {
    const repository = createRepository();
    const ingredientRepository = createIngredientRepository({
      findById: vi.fn().mockResolvedValue(ingredientRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      ingredientRepository as never,
      createUnitRepository() as never
    );

    await expect(
      service.create(
        "branch-1",
        { ingredientId: "ing-1", unitId: "unit-1", openingQuantity: 5, minimumQuantity: 2 },
        "user-1"
      )
    ).rejects.toThrow(InventoryScopeMismatchError);

    expect(repository.createWithOpeningStock).not.toHaveBeenCalled();
  });

  it("create() throws InventoryScopeMismatchError when the unit belongs to a different restaurant", async () => {
    const repository = createRepository();
    const unitRepository = createUnitRepository({
      findById: vi.fn().mockResolvedValue(unitRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      unitRepository as never
    );

    await expect(
      service.create(
        "branch-1",
        { ingredientId: "ing-1", unitId: "unit-1", openingQuantity: 5, minimumQuantity: 2 },
        "user-1"
      )
    ).rejects.toThrow(InventoryScopeMismatchError);

    expect(repository.createWithOpeningStock).not.toHaveBeenCalled();
  });

  it("create() throws InventoryItemAlreadyExistsError when the branch already tracks this ingredient", async () => {
    const repository = createRepository({
      findByBranchAndIngredient: vi.fn().mockResolvedValue(itemRow()),
    });
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await expect(
      service.create(
        "branch-1",
        { ingredientId: "ing-1", unitId: "unit-1", openingQuantity: 5, minimumQuantity: 2 },
        "user-1"
      )
    ).rejects.toThrow(InventoryItemAlreadyExistsError);

    expect(repository.createWithOpeningStock).not.toHaveBeenCalled();
  });

  it("update() 404s before updating when the item doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await expect(service.update("missing", { minimumQuantity: 3 })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() persists the new minimumQuantity", async () => {
    const repository = createRepository();
    const service = new InventoryItemService(
      repository as never,
      createBranchRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await service.update("item-1", { minimumQuantity: 3 });

    expect(repository.update).toHaveBeenCalledWith("item-1", { minimumQuantity: 3 });
  });
});
