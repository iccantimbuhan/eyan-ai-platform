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

function createBrandKitRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    findById: vi.fn().mockResolvedValue(null),
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

function createAnalyticsEventRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    create: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function buildService(
  overrides: {
    repository?: Partial<Record<string, unknown>>;
    projectRepository?: Partial<Record<string, unknown>>;
    brandKitRepository?: Partial<Record<string, unknown>>;
    chatService?: Partial<Record<string, unknown>>;
    analyticsEventRepository?: Partial<Record<string, unknown>>;
  } = {}
) {
  const repository = createRepository(overrides.repository);
  const projectRepository = createProjectRepository(overrides.projectRepository);
  const brandKitRepository = createBrandKitRepository(overrides.brandKitRepository);
  const chatService = createChatService(overrides.chatService);
  const analyticsEventRepository = createAnalyticsEventRepository(
    overrides.analyticsEventRepository
  );

  const service = new ContentService(
    repository as never,
    projectRepository as never,
    brandKitRepository as never,
    chatService as never,
    analyticsEventRepository as never
  );

  return {
    service,
    repository,
    projectRepository,
    brandKitRepository,
    chatService,
    analyticsEventRepository,
  };
}

describe("ContentService", () => {
  it("generate() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const { service, chatService, repository } = buildService({
      projectRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

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
    const { service, repository, projectRepository } = buildService();

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
      brandKitId: null,
      type: "BLOG",
      prompt: "Write about X",
      output: "Generated output",
      model: "qwen2.5",
      createdBy: "user-1",
      generationTimeMs: expect.any(Number),
    });
  });

  it("generate() captures a non-negative generationTimeMs around the chat call", async () => {
    const { service, repository } = buildService();

    await service.generate(
      { projectId: "proj-1", type: "BLOG", prompt: "Write about X" },
      "user-1"
    );

    const [[payload]] = repository.create.mock.calls;
    expect(payload.generationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("generate() throws NotFoundError when brandKitId doesn't resolve to a kit owned by the caller", async () => {
    const { service, chatService } = buildService({
      brandKitRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.generate(
        { projectId: "proj-1", type: "BLOG", prompt: "Write about X", brandKitId: "bk-1" },
        "user-1"
      )
    ).rejects.toThrow("Brand kit not found.");

    expect(chatService.chat).not.toHaveBeenCalled();
  });

  it("generate() throws NotFoundError when the brand kit belongs to a different project", async () => {
    const { service } = buildService({
      brandKitRepository: {
        findById: vi.fn().mockResolvedValue({ id: "bk-1", projectId: "proj-other" }),
      },
    });

    await expect(
      service.generate(
        { projectId: "proj-1", type: "BLOG", prompt: "Write about X", brandKitId: "bk-1" },
        "user-1"
      )
    ).rejects.toThrow("Brand kit not found.");
  });

  it("generate() folds brand kit guidance into the system prompt and persists brandKitId", async () => {
    const brandKit = {
      id: "bk-1",
      projectId: "proj-1",
      name: "Acme",
      toneOfVoice: "Confident and friendly",
      writingStyle: null,
      audience: null,
      ctaStyle: null,
      approvedTerminology: ["Acme"],
      restrictedWords: ["cheap"],
      brandGuidelines: null,
    };
    const { service, repository, chatService } = buildService({
      brandKitRepository: { findById: vi.fn().mockResolvedValue(brandKit) },
    });

    await service.generate(
      { projectId: "proj-1", type: "BLOG", prompt: "Write about X", brandKitId: "bk-1" },
      "user-1"
    );

    const [messages] = chatService.chat.mock.calls[0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Confident and friendly");
    expect(messages[0].content).toContain("Acme");
    expect(messages[0].content).toContain("cheap");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ brandKitId: "bk-1" })
    );
  });

  it("list() throws NotFoundError when the project doesn't exist or isn't owned by the caller", async () => {
    const { service, repository } = buildService({
      projectRepository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.list({ projectId: "proj-1" }, "user-2")
    ).rejects.toThrow("Project not found.");

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("list() scopes both findMany and count to the requesting userId once ownership is verified", async () => {
    const { service, repository } = buildService();

    await service.list({ projectId: "proj-1" }, "user-1");

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", userId: "user-1" })
    );
    expect(repository.count).toHaveBeenCalledWith("proj-1", "user-1");
  });

  it("getById() throws NotFoundError when the content doesn't exist or isn't owned by the caller", async () => {
    const { service } = buildService({
      repository: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getById("content-1", "user-2")).rejects.toThrow(
      "Generated content not found."
    );
  });

  it("delete() verifies ownership before deleting", async () => {
    const { service, repository } = buildService({
      repository: { findById: vi.fn().mockResolvedValue(null), delete: vi.fn() },
    });

    await expect(service.delete("content-1", "user-2")).rejects.toThrow(
      "Generated content not found."
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("delete() removes the row once ownership is verified", async () => {
    const { service, repository } = buildService();

    await service.delete("content-1", "user-1");

    expect(repository.findById).toHaveBeenCalledWith("content-1", "user-1");
    expect(repository.delete).toHaveBeenCalledWith("content-1");
  });

  // Sprint 6.5 (Analytics Foundation) — the analytics write is fire-and-
  // forget and must never interrupt generation. See ADR-0011.
  describe("generate() — analytics", () => {
    it("records a GENERATED analytics event with the content's provider/model/duration", async () => {
      const { service, analyticsEventRepository } = buildService();

      await service.generate(
        { projectId: "proj-1", type: "BLOG", prompt: "Write about X", brandKitId: undefined },
        "user-1"
      );

      expect(analyticsEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          assetType: "BLOG",
          sourceId: "content-1",
          type: "GENERATED",
          actorId: "user-1",
          provider: "ollama",
          model: "qwen2.5",
          generationTimeMs: expect.any(Number),
          brandKitId: null,
        })
      );
    });

    it("still returns the generated content successfully even when the analytics write rejects", async () => {
      const { service } = buildService({
        analyticsEventRepository: {
          create: vi.fn().mockRejectedValue(new Error("db unavailable")),
        },
      });

      const result = await service.generate(
        { projectId: "proj-1", type: "BLOG", prompt: "Write about X" },
        "user-1"
      );

      expect(result).toEqual({ id: "content-1" });
    });
  });
});
