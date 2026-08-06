import { describe, expect, it, vi } from "vitest";

import { IngredientService } from "./ingredient.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { RestaurantProductScopeMismatchError } from "../errors/restaurant-product.error.js";

function ingredientRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ing-1",
    restaurantId: "rest-1",
    ingredientCategoryId: "icat-1",
    name: "Oil",
    suppliers: [
      { supplier: { id: "sup-1", name: "J.Calleja" } },
      { supplier: { id: "sup-2", name: "Schembri Ltd" } },
    ],
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "icat-1", restaurantId: "rest-1", name: "Dry Goods", ...overrides };
}

function supplierRow(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return { id, restaurantId: "rest-1", name: id, ...overrides };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(ingredientRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([ingredientRow()]),
    create: vi.fn().mockResolvedValue(ingredientRow()),
    update: vi.fn().mockResolvedValue(ingredientRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(ingredientRow()),
    ...overrides,
  };
}

function createCategoryRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(categoryRow()),
    ...overrides,
  };
}

function createSupplierRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByIds: vi.fn().mockResolvedValue([supplierRow("sup-1"), supplierRow("sup-2")]),
    ...overrides,
  };
}

describe("IngredientService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new IngredientService(
      repository as never,
      createCategoryRepository() as never,
      createSupplierRepository() as never
    );

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the ingredient doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new IngredientService(
      repository as never,
      createCategoryRepository() as never,
      createSupplierRepository() as never
    );

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() persists an ingredient whose category and suppliers all belong to the same restaurant — the real Burger's Ink order sheet shows 'oil' sourced from two suppliers", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository();
    const supplierRepository = createSupplierRepository();
    const service = new IngredientService(
      repository as never,
      categoryRepository as never,
      supplierRepository as never
    );

    await service.create("rest-1", {
      name: "Oil",
      ingredientCategoryId: "icat-1",
      supplierIds: ["sup-1", "sup-2"],
    });

    expect(repository.create).toHaveBeenCalledWith({
      restaurantId: "rest-1",
      name: "Oil",
      ingredientCategoryId: "icat-1",
      supplierIds: ["sup-1", "sup-2"],
    });
  });

  // The single highest-risk footgun for this module (.context/restaurant.md):
  // a client-supplied ingredientCategoryId/supplierIds must never be trusted
  // to belong to the restaurantId the route already authorized against.
  it("create() throws RestaurantProductScopeMismatchError when the category belongs to a different restaurant", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository({
      findById: vi.fn().mockResolvedValue(categoryRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new IngredientService(
      repository as never,
      categoryRepository as never,
      createSupplierRepository() as never
    );

    await expect(
      service.create("rest-1", { name: "X", ingredientCategoryId: "icat-1" })
    ).rejects.toThrow(RestaurantProductScopeMismatchError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("create() throws RestaurantProductScopeMismatchError when one of the suppliers belongs to a different restaurant", async () => {
    const repository = createRepository();
    const supplierRepository = createSupplierRepository({
      findManyByIds: vi
        .fn()
        .mockResolvedValue([supplierRow("sup-1"), supplierRow("sup-2", { restaurantId: "rest-OTHER" })]),
    });
    const service = new IngredientService(
      repository as never,
      createCategoryRepository() as never,
      supplierRepository as never
    );

    await expect(
      service.create("rest-1", { name: "X", supplierIds: ["sup-1", "sup-2"] })
    ).rejects.toThrow(RestaurantProductScopeMismatchError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("update() replaces the supplier set when supplierIds is provided", async () => {
    const repository = createRepository();
    const supplierRepository = createSupplierRepository();
    const service = new IngredientService(
      repository as never,
      createCategoryRepository() as never,
      supplierRepository as never
    );

    await service.update("ing-1", { supplierIds: ["sup-1", "sup-2"] });

    expect(supplierRepository.findManyByIds).toHaveBeenCalledWith(["sup-1", "sup-2"]);
    expect(repository.update).toHaveBeenCalledWith(
      "ing-1",
      expect.objectContaining({ supplierIds: ["sup-1", "sup-2"] })
    );
  });

  it("update() skips category/supplier checks when neither is being changed", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository();
    const supplierRepository = createSupplierRepository();
    const service = new IngredientService(
      repository as never,
      categoryRepository as never,
      supplierRepository as never
    );

    await service.update("ing-1", { name: "Renamed" });

    expect(categoryRepository.findById).not.toHaveBeenCalled();
    expect(supplierRepository.findManyByIds).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the ingredient doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new IngredientService(
      repository as never,
      createCategoryRepository() as never,
      createSupplierRepository() as never
    );

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
