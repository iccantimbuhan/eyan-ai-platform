import { describe, expect, it, vi } from "vitest";

import { RestaurantService } from "./restaurant.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function restaurantRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rest-1",
    organizationId: "org-1",
    name: "Burger's Ink",
    branches: [],
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(restaurantRow()),
    findManyByIds: vi.fn().mockResolvedValue([restaurantRow()]),
    findManyByOrganizationIds: vi.fn().mockResolvedValue([restaurantRow()]),
    create: vi.fn().mockResolvedValue(restaurantRow()),
    update: vi.fn().mockResolvedValue(restaurantRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(restaurantRow()),
    ...overrides,
  };
}

describe("RestaurantService", () => {
  it("list() returns restaurants scoped to the given organization only", async () => {
    const repository = createRepository();
    const service = new RestaurantService(repository as never);

    const result = await service.list("org-1");

    expect(repository.findManyByOrganizationIds).toHaveBeenCalledWith(["org-1"]);
    expect(result).toEqual([expect.objectContaining({ id: "rest-1", organizationId: "org-1" })]);
  });

  it("getById() throws NotFoundError when the restaurant doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RestaurantService(repository as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() creates the restaurant under the given organizationId, never a client-supplied one", async () => {
    const repository = createRepository();
    const service = new RestaurantService(repository as never);

    await service.create("org-1", { name: "Topo Gigio Pizzeria" });

    expect(repository.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Topo Gigio Pizzeria",
    });
  });

  it("update() 404s before writing when the restaurant doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RestaurantService(repository as never);

    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the restaurant doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new RestaurantService(repository as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
