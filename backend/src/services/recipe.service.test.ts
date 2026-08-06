import { describe, expect, it, vi } from "vitest";

import { RecipeService } from "./recipe.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  MenuItemAlreadyHasRecipeError,
  RestaurantProductScopeMismatchError,
} from "../errors/restaurant-product.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value };
}

function recipeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "recipe-1",
    restaurantId: "rest-1",
    menuItemId: "item-1",
    notes: null,
    ingredients: [
      {
        id: "line-1",
        ingredientId: "ing-1",
        ingredient: { name: "Beef Patty" },
        unitId: "unit-1",
        unit: { abbreviation: "pc" },
        quantity: decimal("2.00"),
      },
    ],
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function menuItemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "item-1", restaurantId: "rest-1", name: "Ultimate Cheese Burger", ...overrides };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(recipeRow()),
    findByMenuItemId: vi.fn().mockResolvedValue(null),
    findManyByRestaurantId: vi.fn().mockResolvedValue([recipeRow()]),
    create: vi.fn().mockResolvedValue(recipeRow()),
    update: vi.fn().mockResolvedValue(recipeRow({ notes: "Updated" })),
    delete: vi.fn().mockResolvedValue(recipeRow()),
    ...overrides,
  };
}

function createMenuItemRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(menuItemRow()),
    ...overrides,
  };
}

describe("RecipeService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new RecipeService(repository as never, createMenuItemRepository() as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the recipe doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RecipeService(repository as never, createMenuItemRepository() as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() persists a recipe whose menu item belongs to the same restaurant", async () => {
    const repository = createRepository();
    const menuItemRepository = createMenuItemRepository();
    const service = new RecipeService(repository as never, menuItemRepository as never);

    await service.create("rest-1", { menuItemId: "item-1" });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: "rest-1", menuItemId: "item-1" })
    );
  });

  // Mirrors MenuItemService's assertCategoryBelongsToRestaurant defense: a
  // client-supplied menuItemId must never be trusted without re-verifying it
  // belongs to the restaurantId the route already authorized against.
  it("create() throws RestaurantProductScopeMismatchError when the menu item belongs to a different restaurant", async () => {
    const repository = createRepository();
    const menuItemRepository = createMenuItemRepository({
      findById: vi.fn().mockResolvedValue(menuItemRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new RecipeService(repository as never, menuItemRepository as never);

    await expect(service.create("rest-1", { menuItemId: "item-1" })).rejects.toThrow(
      RestaurantProductScopeMismatchError
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  // Recipe.menuItemId is unique — "Each Recipe belongs to one Menu Item."
  it("create() throws MenuItemAlreadyHasRecipeError when the menu item already has a recipe", async () => {
    const repository = createRepository({
      findByMenuItemId: vi.fn().mockResolvedValue(recipeRow()),
    });
    const service = new RecipeService(repository as never, createMenuItemRepository() as never);

    await expect(service.create("rest-1", { menuItemId: "item-1" })).rejects.toThrow(
      MenuItemAlreadyHasRecipeError
    );

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the recipe doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RecipeService(repository as never, createMenuItemRepository() as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
