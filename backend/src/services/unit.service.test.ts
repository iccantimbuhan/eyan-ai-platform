import { describe, expect, it, vi } from "vitest";

import { UnitService } from "./unit.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function unitRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "unit-1",
    restaurantId: "rest-1",
    name: "Kilogram",
    abbreviation: "kg",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(unitRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([unitRow()]),
    create: vi.fn().mockResolvedValue(unitRow()),
    update: vi.fn().mockResolvedValue(unitRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(unitRow()),
    ...overrides,
  };
}

describe("UnitService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new UnitService(repository as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the unit doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UnitService(repository as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() creates the unit under the given restaurantId, never a client-supplied one", async () => {
    const repository = createRepository();
    const service = new UnitService(repository as never);

    await service.create("rest-1", { name: "Gram", abbreviation: "g" });

    expect(repository.create).toHaveBeenCalledWith({
      restaurantId: "rest-1",
      name: "Gram",
      abbreviation: "g",
    });
  });

  it("update() 404s before writing when the unit doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UnitService(repository as never);

    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the unit doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UnitService(repository as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
