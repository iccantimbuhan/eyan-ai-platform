import { describe, expect, it, vi } from "vitest";

import { ProjectsService } from "./projects.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "proj-1" }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    update: vi.fn().mockResolvedValue({ id: "proj-1" }),
    delete: vi.fn().mockResolvedValue({ id: "proj-1" }),
    ...overrides,
  };
}

describe("ProjectsService", () => {
  it("create() attaches the requesting userId to the repository call", async () => {
    const repository = createRepository();
    const service = new ProjectsService(repository as never);

    await service.create({ name: "My Project" }, "user-1");

    expect(repository.create).toHaveBeenCalledWith({
      name: "My Project",
      userId: "user-1",
    });
  });

  it("list() scopes both findMany and count to the requesting userId", async () => {
    const repository = createRepository();
    const service = new ProjectsService(repository as never);

    await service.list("user-1", {});

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    );
    expect(repository.count).toHaveBeenCalledWith("user-1", undefined);
  });

  it("getById() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ProjectsService(repository as never);

    await expect(service.getById("proj-1", "user-2")).rejects.toThrow(
      "Project not found."
    );
  });

  it("update() verifies ownership before writing, and never leaks whether the row exists for another user", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    });
    const service = new ProjectsService(repository as never);

    await expect(
      service.update("proj-1", { name: "New Name" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete() verifies ownership before deleting", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });
    const service = new ProjectsService(repository as never);

    await expect(service.delete("proj-1", "user-2")).rejects.toThrow(
      "Project not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const repository = createRepository();
    const service = new ProjectsService(repository as never);

    await service.delete("proj-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("proj-1", "user-1");
    expect(repository.delete).toHaveBeenCalledWith("proj-1");
  });
});
