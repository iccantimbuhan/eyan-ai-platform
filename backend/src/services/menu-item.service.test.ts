import { describe, expect, it, vi } from "vitest";

import { MenuItemService } from "./menu-item.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { MenuCategoryMismatchError } from "../errors/restaurant.error.js";

function decimal(value: string) {
  return { toFixed: () => value, toString: () => value };
}

function itemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1",
    restaurantId: "rest-1",
    menuCategoryId: "cat-1",
    name: "Classic Burger",
    description: null,
    price: decimal("250.00"),
    imagePath: null,
    available: true,
    status: "DRAFT",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "cat-1", restaurantId: "rest-1", name: "Burgers", ...overrides };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(itemRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([itemRow()]),
    create: vi.fn().mockResolvedValue(itemRow()),
    update: vi.fn().mockResolvedValue(itemRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(itemRow()),
    ...overrides,
  };
}

function createCategoryRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(categoryRow()),
    ...overrides,
  };
}

describe("MenuItemService", () => {
  it("list() scopes to the given restaurantId, optionally filtered by category", async () => {
    const repository = createRepository();
    const service = new MenuItemService(repository as never, createCategoryRepository() as never);

    await service.list("rest-1", "cat-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1", "cat-1");
  });

  it("getById() throws NotFoundError when the item doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MenuItemService(repository as never, createCategoryRepository() as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() persists a valid item whose category belongs to the same restaurant", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository();
    const service = new MenuItemService(repository as never, categoryRepository as never);

    await service.create("rest-1", {
      menuCategoryId: "cat-1",
      name: "Classic Burger",
      price: "250.00",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: "rest-1", menuCategoryId: "cat-1" })
    );
  });

  // The single highest-risk footgun for this module (.context/restaurant.md):
  // a client-supplied menuCategoryId must never be trusted to belong to the
  // restaurantId the route already authorized against.
  it("create() throws MenuCategoryMismatchError when the category belongs to a different restaurant", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository({
      findById: vi.fn().mockResolvedValue(categoryRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new MenuItemService(repository as never, categoryRepository as never);

    await expect(
      service.create("rest-1", { menuCategoryId: "cat-1", name: "X", price: "1.00" })
    ).rejects.toThrow(MenuCategoryMismatchError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("create() throws MenuCategoryMismatchError when the category doesn't exist at all", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new MenuItemService(repository as never, categoryRepository as never);

    await expect(
      service.create("rest-1", { menuCategoryId: "missing-cat", name: "X", price: "1.00" })
    ).rejects.toThrow(MenuCategoryMismatchError);
  });

  it("update() re-validates the category when menuCategoryId is being changed", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository({
      findById: vi.fn().mockResolvedValue(categoryRow({ restaurantId: "rest-OTHER" })),
    });
    const service = new MenuItemService(repository as never, categoryRepository as never);

    await expect(
      service.update("item-1", { menuCategoryId: "cat-in-other-restaurant" })
    ).rejects.toThrow(MenuCategoryMismatchError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() skips the category check when menuCategoryId isn't being changed", async () => {
    const repository = createRepository();
    const categoryRepository = createCategoryRepository();
    const service = new MenuItemService(repository as never, categoryRepository as never);

    await service.update("item-1", { name: "Renamed" });

    expect(categoryRepository.findById).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the item doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MenuItemService(repository as never, createCategoryRepository() as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
