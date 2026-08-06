import { describe, expect, it, vi } from "vitest";

import { RecipeIngredientService } from "./recipe-ingredient.service.js";
import { ConflictError, NotFoundError } from "../errors/auth.error.js";
import { RestaurantProductScopeMismatchError } from "../errors/restaurant-product.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value };
}

function lineRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "line-1",
    restaurantId: "rest-1",
    recipeId: "recipe-1",
    ingredientId: "ing-1",
    ingredient: { name: "Lettuce" },
    unitId: "unit-1",
    unit: { abbreviation: "g" },
    quantity: decimal("20.00"),
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function recipeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "recipe-1", restaurantId: "rest-1", menuItemId: "item-1", ...overrides };
}

function ingredientRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "ing-1", restaurantId: "rest-1", name: "Lettuce", ...overrides };
}

function unitRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "unit-1", restaurantId: "rest-1", abbreviation: "g", ...overrides };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(lineRow()),
    findByRecipeAndIngredient: vi.fn().mockResolvedValue(null),
    findManyByRecipeId: vi.fn().mockResolvedValue([lineRow()]),
    create: vi.fn().mockResolvedValue(lineRow()),
    update: vi.fn().mockResolvedValue(lineRow({ quantity: decimal("25.00") })),
    delete: vi.fn().mockResolvedValue(lineRow()),
    ...overrides,
  };
}

function createRecipeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(recipeRow()), ...overrides };
}

function createIngredientRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(ingredientRow()), ...overrides };
}

function createUnitRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { findById: vi.fn().mockResolvedValue(unitRow()), ...overrides };
}

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  recipeRepository?: Partial<Record<string, unknown>>;
  ingredientRepository?: Partial<Record<string, unknown>>;
  unitRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new RecipeIngredientService(
    createRepository(overrides.repository) as never,
    createRecipeRepository(overrides.recipeRepository) as never,
    createIngredientRepository(overrides.ingredientRepository) as never,
    createUnitRepository(overrides.unitRepository) as never
  );
}

describe("RecipeIngredientService", () => {
  it("list() delegates to the repository by recipeId", async () => {
    const repository = createRepository();
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await service.list("recipe-1");

    expect(repository.findManyByRecipeId).toHaveBeenCalledWith("recipe-1");
  });

  it("getById() throws NotFoundError when the line doesn't exist", async () => {
    const service = buildService({ repository: { findById: vi.fn().mockResolvedValue(null) } });

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  // The Ultimate Cheese Burger example from the sprint spec: 20g Lettuce,
  // resolved via a recipe whose parent restaurant the ingredient/unit must
  // both belong to.
  it("create() persists a valid line whose ingredient and unit belong to the recipe's restaurant", async () => {
    const repository = createRepository();
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await service.create("recipe-1", { ingredientId: "ing-1", unitId: "unit-1", quantity: 20 });

    expect(repository.create).toHaveBeenCalledWith({
      restaurantId: "rest-1",
      recipeId: "recipe-1",
      ingredientId: "ing-1",
      unitId: "unit-1",
      quantity: 20,
    });
  });

  it("create() throws NotFoundError when the recipe doesn't exist", async () => {
    const service = buildService({
      recipeRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.create("missing-recipe", { ingredientId: "ing-1", unitId: "unit-1", quantity: 1 })
    ).rejects.toThrow(NotFoundError);
  });

  // Defense-in-depth mirroring IngredientService/MenuItemService: recipeId
  // is authorized by requireRecipeAccess at the route, but ingredientId/
  // unitId are client-supplied and could point at rows under a different
  // Restaurant.
  it("create() throws RestaurantProductScopeMismatchError when the ingredient belongs to a different restaurant", async () => {
    const repository = createRepository();
    const ingredientRepository = createIngredientRepository({
      findById: vi.fn().mockResolvedValue(ingredientRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      ingredientRepository as never,
      createUnitRepository() as never
    );

    await expect(
      service.create("recipe-1", { ingredientId: "ing-1", unitId: "unit-1", quantity: 20 })
    ).rejects.toThrow(RestaurantProductScopeMismatchError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("create() throws RestaurantProductScopeMismatchError when the unit belongs to a different restaurant", async () => {
    const repository = createRepository();
    const unitRepository = createUnitRepository({
      findById: vi.fn().mockResolvedValue(unitRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      createIngredientRepository() as never,
      unitRepository as never
    );

    await expect(
      service.create("recipe-1", { ingredientId: "ing-1", unitId: "unit-1", quantity: 20 })
    ).rejects.toThrow(RestaurantProductScopeMismatchError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("create() throws ConflictError when the ingredient is already on the recipe", async () => {
    const repository = createRepository({
      findByRecipeAndIngredient: vi.fn().mockResolvedValue(lineRow()),
    });
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await expect(
      service.create("recipe-1", { ingredientId: "ing-1", unitId: "unit-1", quantity: 20 })
    ).rejects.toThrow(ConflictError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("update() skips ingredient/unit checks when neither is being changed", async () => {
    const repository = createRepository();
    const ingredientRepository = createIngredientRepository();
    const unitRepository = createUnitRepository();
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      ingredientRepository as never,
      unitRepository as never
    );

    await service.update("line-1", { quantity: 25 });

    expect(ingredientRepository.findById).not.toHaveBeenCalled();
    expect(unitRepository.findById).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the line doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RecipeIngredientService(
      repository as never,
      createRecipeRepository() as never,
      createIngredientRepository() as never,
      createUnitRepository() as never
    );

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
