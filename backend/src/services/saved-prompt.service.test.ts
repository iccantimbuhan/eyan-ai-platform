import { describe, expect, it, vi } from "vitest";

import { SavedPromptService } from "./saved-prompt.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "sp-1" }),
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: "sp-1", userId: "user-1" }),
    update: vi.fn().mockResolvedValue({ id: "sp-1" }),
    delete: vi.fn().mockResolvedValue({ id: "sp-1" }),
    ...overrides,
  };
}

describe("SavedPromptService", () => {
  it("create() attaches the requesting userId to the repository call", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    await service.create(
      { name: "My Prompt", promptBody: "Write about {{topic}}.", contentType: "BLOG" },
      "user-1"
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: "My Prompt",
      promptBody: "Write about {{topic}}.",
      contentType: "BLOG",
      userId: "user-1",
    });
  });

  it("create() passes projectId through when provided, scoping the prompt to a project", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    await service.create(
      {
        name: "Project Prompt",
        promptBody: "Write about {{topic}}.",
        contentType: "BLOG",
        projectId: "project-1",
      },
      "user-1"
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: "Project Prompt",
      promptBody: "Write about {{topic}}.",
      contentType: "BLOG",
      projectId: "project-1",
      userId: "user-1",
    });
  });

  it("list() delegates to the repository with the requesting userId", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    await service.list("user-1");

    expect(repository.findMany).toHaveBeenCalledWith("user-1");
  });

  it("getById() returns the prompt when the repository finds it", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    const result = await service.getById("sp-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("sp-1", "user-1");
    expect(result).toEqual({ id: "sp-1", userId: "user-1" });
  });

  it("getById() throws NotFoundError when the prompt doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new SavedPromptService(repository as never);

    await expect(service.getById("sp-1", "user-2")).rejects.toThrow(
      "Saved prompt not found."
    );
  });

  it("update() verifies ownership before writing, and never leaks whether the row exists for another user", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    });
    const service = new SavedPromptService(repository as never);

    await expect(
      service.update("sp-1", { name: "New Name" }, "user-2")
    ).rejects.toThrow("Saved prompt not found.");

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() writes through once ownership is verified", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    await service.update("sp-1", { name: "New Name" }, "user-1");

    expect(repository.findById).toHaveBeenCalledWith("sp-1", "user-1");
    expect(repository.update).toHaveBeenCalledWith("sp-1", { name: "New Name" });
  });

  it("delete() verifies ownership before deleting", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });
    const service = new SavedPromptService(repository as never);

    await expect(service.delete("sp-1", "user-2")).rejects.toThrow(
      "Saved prompt not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const repository = createRepository();
    const service = new SavedPromptService(repository as never);

    await service.delete("sp-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("sp-1", "user-1");
    expect(repository.delete).toHaveBeenCalledWith("sp-1");
  });
});
