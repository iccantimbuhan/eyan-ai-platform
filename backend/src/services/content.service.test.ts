import { describe, expect, it, vi } from "vitest";

import { ContentService } from "./content.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "content-1" }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findById: vi
      .fn()
      .mockResolvedValue({ id: "content-1", projectId: "proj-1" }),
    delete: vi.fn().mockResolvedValue({ id: "content-1" }),
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

function createChatService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    chat: vi
      .fn()
      .mockResolvedValue({ response: "Generated output", model: "qwen2.5" }),
    ...overrides,
  };
}

describe("ContentService", () => {
  it("generate() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const chatService = createChatService();
    const service = new ContentService(
      repository as never,
      projectRepository as never,
      chatService as never
    );

    await expect(
      service.generate(
        { projectId: "proj-1", type: "BLOG", prompt: "Write about X" },
        "user-2"
      )
    ).rejects.toThrow("Project not found.");

    expect(chatService.chat).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("generate() scopes the project lookup to the requesting userId and persists with createdBy set", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const chatService = createChatService();
    const service = new ContentService(
      repository as never,
      projectRepository as never,
      chatService as never
    );

    await service.generate(
      { projectId: "proj-1", type: "BLOG", prompt: "Write about X" },
      "user-1"
    );

    expect(projectRepository.findById).toHaveBeenCalledWith(
      "proj-1",
      "user-1"
    );
    expect(repository.create).toHaveBeenCalledWith({
      projectId: "proj-1",
      type: "BLOG",
      prompt: "Write about X",
      output: "Generated output",
      model: "qwen2.5",
      createdBy: "user-1",
      generationTimeMs: expect.any(Number),
    });
  });

  it("generate() captures a non-negative generationTimeMs around the chat call", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const chatService = createChatService();
    const service = new ContentService(
      repository as never,
      projectRepository as never,
      chatService as never
    );

    await service.generate(
      { projectId: "proj-1", type: "BLOG", prompt: "Write about X" },
      "user-1"
    );

    const [[payload]] = repository.create.mock.calls;
    expect(payload.generationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("list() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ContentService(
      repository as never,
      projectRepository as never,
      createChatService() as never
    );

    await expect(
      service.list({ projectId: "proj-1" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("list() scopes both findMany and count to the requesting userId once ownership is verified", async () => {
    const repository = createRepository();
    const projectRepository = createProjectRepository();
    const service = new ContentService(
      repository as never,
      projectRepository as never,
      createChatService() as never
    );

    await service.list({ projectId: "proj-1" }, "user-1");

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", userId: "user-1" })
    );
    expect(repository.count).toHaveBeenCalledWith("proj-1", "user-1");
  });

  it("getById() throws NotFoundError when the content doesn't exist or isn't owned by the caller", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new ContentService(
      repository as never,
      createProjectRepository() as never,
      createChatService() as never
    );

    await expect(service.getById("content-1", "user-2")).rejects.toThrow(
      "Generated content not found."
    );
  });

  it("delete() verifies ownership before deleting", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });
    const service = new ContentService(
      repository as never,
      createProjectRepository() as never,
      createChatService() as never
    );

    await expect(service.delete("content-1", "user-2")).rejects.toThrow(
      "Generated content not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const repository = createRepository();
    const service = new ContentService(
      repository as never,
      createProjectRepository() as never,
      createChatService() as never
    );

    await service.delete("content-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("content-1", "user-1");
    expect(repository.delete).toHaveBeenCalledWith("content-1");
  });
});
