import { beforeEach, describe, expect, it, vi } from "vitest";

const createProviderMock = vi.fn();

vi.mock("../providers/ai-core-provider.factory.js", () => ({
  AiCoreProviderFactory: { create: createProviderMock },
}));

const { AiConversationService } = await import("./ai-conversation.service.js");
const { AiConversationError } = await import("../errors/ai-core-provider.error.js");
const { NotFoundError } = await import("../errors/auth.error.js");

const BRAIN = { id: "brain-1", key: "general-chat-brain", isEnabled: true };
const PROVIDER = { id: "provider-1", key: "ollama", baseUrl: "http://127.0.0.1:11434", kind: "LOCAL" };
const MODEL = { id: "model-1", modelKey: "qwen2.5-coder:7b" };
const POLICY = { id: "policy-1", preferredProvider: PROVIDER, preferredModel: MODEL };

function createServices(overrides: {
  brainService?: Partial<Record<string, unknown>>;
  routingPolicyService?: Partial<Record<string, unknown>>;
  providerService?: Partial<Record<string, unknown>>;
  repository?: Partial<Record<string, unknown>>;
  usageService?: Partial<Record<string, unknown>>;
} = {}) {
  const brainService = { getByKey: vi.fn().mockResolvedValue(BRAIN), ...overrides.brainService };
  const routingPolicyService = { getActiveByBrain: vi.fn().mockResolvedValue(POLICY), ...overrides.routingPolicyService };
  const providerService = { resolveCredentials: vi.fn().mockResolvedValue(null), ...overrides.providerService };
  const repository = {
    create: vi.fn().mockResolvedValue({ id: "conv-new" }),
    findByIdWithMessages: vi.fn().mockResolvedValue(null),
    appendMessage: vi.fn().mockResolvedValue({}),
    appendMessages: vi.fn().mockResolvedValue(undefined),
    touch: vi.fn().mockResolvedValue({}),
    ...overrides.repository,
  };
  const usageService = { record: vi.fn().mockResolvedValue(undefined), ...overrides.usageService };

  return { brainService, routingPolicyService, providerService, repository, usageService };
}

function buildService(services: ReturnType<typeof createServices>) {
  return new AiConversationService(
    services.brainService as never,
    services.routingPolicyService as never,
    services.providerService as never,
    services.repository as never,
    services.usageService as never
  );
}

describe("AiConversationService.converse", () => {
  beforeEach(() => {
    createProviderMock.mockReset();
  });

  it("creates a brand-new conversation when no conversationId is supplied, sends only the given turn, and persists both sides", async () => {
    const chat = vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", content: "hi there", raw: {} });
    createProviderMock.mockReturnValue({ chat });
    const services = createServices();
    const service = buildService(services);

    const result = await service.converse({
      brainKey: "general-chat-brain",
      messages: [{ role: "user", content: "hi" }],
      actorId: "user-1",
    });

    expect(services.repository.create).toHaveBeenCalledWith({ brainId: "brain-1" });
    expect(chat).toHaveBeenCalledWith(
      [{ role: "user", content: "hi" }],
      { model: "qwen2.5-coder:7b", baseUrl: "http://127.0.0.1:11434", maxTokens: undefined },
      undefined
    );
    expect(services.repository.appendMessages).toHaveBeenCalledWith([
      { conversationId: "conv-new", role: "USER", content: "hi" },
    ]);
    expect(services.repository.appendMessage).toHaveBeenCalledWith({
      conversationId: "conv-new",
      role: "ASSISTANT",
      content: "hi there",
    });
    expect(result).toEqual({
      conversationId: "conv-new",
      content: "hi there",
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      brain: "general-chat-brain",
      latencyMs: expect.any(Number),
    });
  });

  it("loads and prepends stored history when a conversationId is supplied", async () => {
    const chat = vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", content: "sure, continuing", raw: {} });
    createProviderMock.mockReturnValue({ chat });
    const services = createServices({
      repository: {
        findByIdWithMessages: vi.fn().mockResolvedValue({
          id: "conv-1",
          brainId: "brain-1",
          messages: [
            { role: "USER", content: "hi" },
            { role: "ASSISTANT", content: "hi there" },
          ],
        }),
      },
    });
    const service = buildService(services);

    await service.converse({
      brainKey: "general-chat-brain",
      conversationId: "conv-1",
      messages: [{ role: "user", content: "and then?" }],
      actorId: null,
    });

    expect(chat).toHaveBeenCalledWith(
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hi there" },
        { role: "user", content: "and then?" },
      ],
      expect.anything(),
      undefined
    );
  });

  it("throws NotFoundError when the Brain doesn't exist or is disabled", async () => {
    const services = createServices({ brainService: { getByKey: vi.fn().mockResolvedValue(null) } });
    const service = buildService(services);

    await expect(
      service.converse({ brainKey: "missing-brain", messages: [{ role: "user", content: "hi" }], actorId: null })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the Brain has no active Routing Policy", async () => {
    const services = createServices({ routingPolicyService: { getActiveByBrain: vi.fn().mockResolvedValue(null) } });
    const service = buildService(services);

    await expect(
      service.converse({ brainKey: "general-chat-brain", messages: [{ role: "user", content: "hi" }], actorId: null })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when a supplied conversationId doesn't resolve to this Brain", async () => {
    const services = createServices({
      repository: { findByIdWithMessages: vi.fn().mockResolvedValue({ id: "conv-1", brainId: "other-brain", messages: [] }) },
    });
    const service = buildService(services);

    await expect(
      service.converse({
        brainKey: "general-chat-brain",
        conversationId: "conv-1",
        messages: [{ role: "user", content: "hi" }],
        actorId: null,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws an already-classified AiConversationError and records a failed usage log when the provider call fails", async () => {
    const chat = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    createProviderMock.mockReturnValue({ chat });
    const services = createServices();
    const service = buildService(services);

    await expect(
      service.converse({ brainKey: "general-chat-brain", messages: [{ role: "user", content: "hi" }], actorId: null })
    ).rejects.toBeInstanceOf(AiConversationError);

    expect(services.usageService.record).toHaveBeenCalledWith(
      expect.objectContaining({ brainId: "brain-1", outcome: "TRANSIENT_FAILURE", needsManualReview: true })
    );
  });
});

describe("AiConversationService.streamConverse", () => {
  beforeEach(() => {
    createProviderMock.mockReset();
  });

  it("yields each provider chunk, accumulates the full reply, and persists it once done", async () => {
    async function* fakeStream() {
      yield { delta: "hi", done: false, raw: { message: { content: "hi" }, done: false } };
      yield { delta: " there", done: true, raw: { message: { content: " there" }, done: true } };
    }
    createProviderMock.mockReturnValue({ streamChat: fakeStream });
    const services = createServices();
    const service = buildService(services);

    const chunks = [];
    for await (const chunk of service.streamConverse({
      brainKey: "general-chat-brain",
      messages: [{ role: "user", content: "hi" }],
      actorId: null,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].conversationId).toBe("conv-new");
    expect(services.repository.appendMessage).toHaveBeenCalledWith({
      conversationId: "conv-new",
      role: "ASSISTANT",
      content: "hi there",
    });
    expect(services.repository.touch).toHaveBeenCalledWith("conv-new");
  });

  it("persists the user's turn before streaming begins", async () => {
    async function* fakeStream() {
      yield { delta: "ok", done: true, raw: {} };
    }
    createProviderMock.mockReturnValue({ streamChat: fakeStream });
    const services = createServices();
    const service = buildService(services);

    const iterator = service.streamConverse({
      brainKey: "general-chat-brain",
      messages: [{ role: "user", content: "hi" }],
      actorId: null,
    });
    await iterator.next();

    expect(services.repository.appendMessages).toHaveBeenCalledWith([
      { conversationId: "conv-new", role: "USER", content: "hi" },
    ]);
  });

  it("throws a 501 AiConversationError when the resolved provider doesn't implement streamChat", async () => {
    createProviderMock.mockReturnValue({ chat: vi.fn() });
    const services = createServices();
    const service = buildService(services);

    const iterator = service.streamConverse({
      brainKey: "general-chat-brain",
      messages: [{ role: "user", content: "hi" }],
      actorId: null,
    });

    await expect(iterator.next()).rejects.toMatchObject({ statusCode: 501, category: "CONFIGURATION_ERROR" });
  });

  it("throws an already-classified AiConversationError when the stream itself fails mid-flight", async () => {
    async function* fakeStream() {
      yield { delta: "hi", done: false, raw: {} };
      throw new Error("stream reset");
    }
    createProviderMock.mockReturnValue({ streamChat: fakeStream });
    const services = createServices();
    const service = buildService(services);

    const run = async () => {
      const chunks = [];
      for await (const chunk of service.streamConverse({
        brainKey: "general-chat-brain",
        messages: [{ role: "user", content: "hi" }],
        actorId: null,
      })) {
        chunks.push(chunk);
      }
      return chunks;
    };

    await expect(run()).rejects.toBeInstanceOf(AiConversationError);
    expect(services.usageService.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "TRANSIENT_FAILURE" })
    );
  });
});
