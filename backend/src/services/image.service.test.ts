import { describe, expect, it, vi } from "vitest";

import { ImageService } from "./image.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi
      .fn()
      .mockResolvedValue({ id: "image-1", projectId: "proj-1" }),
    delete: vi.fn().mockResolvedValue({ id: "image-1" }),
    ...overrides,
  };
}

function createProjectRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    ...overrides,
  };
}

describe("ImageService", () => {
  it("list() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ImageService(
      repository as never,
      projectRepository as never
    );

    await expect(
      service.list({ projectId: "proj-1" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("list() scopes both findMany and count to the requesting userId once ownership is verified", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const service = new ImageService(
      repository as never,
      projectRepository as never
    );

    await service.list({ projectId: "proj-1" }, "user-1");

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", userId: "user-1" })
    );
    expect(repository.count).toHaveBeenCalledWith("proj-1", "user-1");
  });

  it("getById() throws NotFoundError when the image doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ImageService(
      repository as never,
      createProjectRepository() as never
    );

    await expect(service.getById("image-1", "user-2")).rejects.toThrow(
      "Generated image not found."
    );
  });

  it("delete() verifies ownership before deleting", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });
    const service = new ImageService(
      repository as never,
      createProjectRepository() as never
    );

    await expect(service.delete("image-1", "user-2")).rejects.toThrow(
      "Generated image not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const repository = createRepository();
    const service = new ImageService(
      repository as never,
      createProjectRepository() as never
    );

    await service.delete("image-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("image-1", "user-1");
    expect(repository.delete).toHaveBeenCalledWith("image-1");
  });
});
