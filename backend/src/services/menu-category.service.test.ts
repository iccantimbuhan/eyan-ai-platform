import { describe, expect, it, vi } from "vitest";

import { MenuCategoryService } from "./menu-category.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cat-1",
    restaurantId: "rest-1",
    name: "Burgers",
    displayOrder: 0,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(categoryRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([categoryRow()]),
    create: vi.fn().mockResolvedValue(categoryRow()),
    update: vi.fn().mockResolvedValue(categoryRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(categoryRow()),
    ...overrides,
  };
}

describe("MenuCategoryService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new MenuCategoryService(repository as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the category doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MenuCategoryService(repository as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() creates the category under the given restaurantId, never a client-supplied one", async () => {
    const repository = createRepository();
    const service = new MenuCategoryService(repository as never);

    await service.create("rest-1", { name: "Wraps", displayOrder: 2 });

    expect(repository.create).toHaveBeenCalledWith({
      restaurantId: "rest-1",
      name: "Wraps",
      displayOrder: 2,
    });
  });

  it("update() 404s before writing when the category doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MenuCategoryService(repository as never);

    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the category doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MenuCategoryService(repository as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
