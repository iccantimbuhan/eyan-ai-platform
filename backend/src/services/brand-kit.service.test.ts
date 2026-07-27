import { describe, expect, it, vi } from "vitest";

import { BrandKitService } from "./brand-kit.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "bk-1" }),
    findManyByProject: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: "bk-1", projectId: "project-1" }),
    update: vi.fn().mockResolvedValue({ id: "bk-1" }),
    delete: vi.fn().mockResolvedValue({ id: "bk-1" }),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "project-1", userId: "user-1" }),
    ...overrides,
  };
}

describe("BrandKitService", () => {
  it("create() verifies project ownership before creating", async () => {
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const repository = createRepository();
    const service = new BrandKitService(repository as never, projectRepository as never);

    await expect(
      service.create({ projectId: "project-1", name: "Acme" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("create() attaches createdBy once project ownership is verified", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const service = new BrandKitService(repository as never, projectRepository as never);

    await service.create({ projectId: "project-1", name: "Acme" }, "user-1");

    expect(repository.create).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Acme",
      createdBy: "user-1",
    });
  });

  it("list() verifies project ownership before listing", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new BrandKitService(repository as never, projectRepository as never);

    await expect(service.list("project-1", "user-2")).rejects.toThrow(
      "Project not found."
    );

    expect(repository.findManyByProject).not.toHaveBeenCalled();
  });

  it("getById() throws NotFoundError when the kit doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BrandKitService(repository as never, createProjectRepository() as never);

    await expect(service.getById("bk-1", "user-2")).rejects.toThrow(
      "Brand kit not found."
    );
  });

  it("update() verifies ownership before writing", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BrandKitService(repository as never, createProjectRepository() as never);

    await expect(
      service.update("bk-1", { name: "New Name" }, "user-2")
    ).rejects.toThrow("Brand kit not found.");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() writes through once ownership is verified", async () => {
    const repository = createRepository();
    const service = new BrandKitService(repository as never, createProjectRepository() as never);

    await service.update("bk-1", { name: "New Name" }, "user-1");

    expect(repository.update).toHaveBeenCalledWith("bk-1", { name: "New Name" });
  });

  it("delete() verifies ownership before deleting", async () => {
    const repository = createRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new BrandKitService(repository as never, createProjectRepository() as never);

    await expect(service.delete("bk-1", "user-2")).rejects.toThrow(
      "Brand kit not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const repository = createRepository();
    const service = new BrandKitService(repository as never, createProjectRepository() as never);

    await service.delete("bk-1", "user-1");

    expect(repository.delete).toHaveBeenCalledWith("bk-1");
  });
});
