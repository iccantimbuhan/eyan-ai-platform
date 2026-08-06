import { describe, expect, it, vi } from "vitest";

import { BranchService } from "./branch.service.js";
import { NotFoundError } from "../errors/auth.error.js";

function branchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "branch-1",
    restaurantId: "rest-1",
    name: "Main Branch",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(branchRow()),
    findManyByRestaurantId: vi.fn().mockResolvedValue([branchRow()]),
    create: vi.fn().mockResolvedValue(branchRow()),
    update: vi.fn().mockResolvedValue(branchRow({ name: "Renamed" })),
    delete: vi.fn().mockResolvedValue(branchRow()),
    ...overrides,
  };
}

describe("BranchService", () => {
  it("list() scopes to the given restaurantId only", async () => {
    const repository = createRepository();
    const service = new BranchService(repository as never);

    await service.list("rest-1");

    expect(repository.findManyByRestaurantId).toHaveBeenCalledWith("rest-1");
  });

  it("getById() throws NotFoundError when the branch doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BranchService(repository as never);

    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("create() creates the branch under the given restaurantId, never a client-supplied one", async () => {
    const repository = createRepository();
    const service = new BranchService(repository as never);

    await service.create("rest-1", { name: "Downtown" });

    expect(repository.create).toHaveBeenCalledWith({ restaurantId: "rest-1", name: "Downtown" });
  });

  it("update() 404s before writing when the branch doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BranchService(repository as never);

    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() 404s before deleting when the branch doesn't exist", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BranchService(repository as never);

    await expect(service.delete("missing")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
