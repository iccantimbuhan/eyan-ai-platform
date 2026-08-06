import { describe, expect, it, vi } from "vitest";

import { SupplierService } from "./supplier.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function supplierRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sup-1",
    restaurantId: "rest-1",
    name: "360 Food",
    phone: "79006761",
    email: null,
    notes: null,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(supplierRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([supplierRow()]),
    findManyByIds: vi.fn().mockResolvedValue([supplierRow()]),
    create: vi.fn().mockResolvedValue(supplierRow()),
    update: vi.fn().mockResolvedValue(supplierRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(supplierRow()),
    ...overrides,
  };
}

describe("SupplierService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new SupplierService(repository as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the supplier doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new SupplierService(repository as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() creates the supplier under the given restaurantId, never a client-supplied one", async () => {
    const repository = createRepository();
    const service = new SupplierService(repository as never);

    await service.create("rest-1", { name: "J.Calleja", phone: "99085722" });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: "rest-1", name: "J.Calleja", phone: "99085722" })
    );
  });

  it("update() 404s before writing when the supplier doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new SupplierService(repository as never);

    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the supplier doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new SupplierService(repository as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
