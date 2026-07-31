import { beforeEach, describe, expect, it, vi } from "vitest";

const createProviderMock = vi.fn();

vi.mock("../providers/ai-core-provider.factory.js", () => ({
  AiCoreProviderFactory: { create: createProviderMock },
}));

const { AiRoutingService } = await import("./ai-routing.service.js");
const { aiCoreCacheEvents, AI_CORE_CACHE_INVALIDATE } = await import("./ai-cache-invalidation.events.js");

const BRAIN = { id: "brain-1", key: "sales-brain" };
const CAPABILITY = { id: "cap-1", key: "lead-qualification", brainId: "brain-1", isEnabled: true, brain: BRAIN };

const PROVIDER = { id: "provider-1", key: "ollama", baseUrl: "http://localhost:11434", kind: "LOCAL" };
const MODEL = { id: "model-1", modelKey: "qwen2.5-coder:7b" };
const FALLBACK_PROVIDER = { id: "provider-2", key: "openai", baseUrl: null, kind: "HOSTED" };
const FALLBACK_MODEL = { id: "model-2", modelKey: "gpt-4o" };

const POLICY = {
  id: "policy-1",
  brainId: "brain-1",
  maxRetries: 2,
  confidenceHighThreshold: 0.75,
  confidenceMediumThreshold: 0.4,
  preferredProvider: PROVIDER,
  preferredProviderId: PROVIDER.id,
  preferredModel: MODEL,
  preferredModelId: MODEL.id,
  fallbackProvider: null as typeof FALLBACK_PROVIDER | null,
  fallbackModel: null as typeof FALLBACK_MODEL | null,
};

const POLICY_WITH_FALLBACK = {
  ...POLICY,
  fallbackProvider: FALLBACK_PROVIDER,
  fallbackModel: FALLBACK_MODEL,
};

const PROMPT = { id: "prompt-1", brainId: "brain-1", version: "v1", body: "Analyze: {{name}}" };

function createRepositories(overrides: {
  policy?: unknown;
} = {}) {
  return {
    capabilityRepository: {
      findByKeyWithBrain: vi.fn().mockResolvedValue(CAPABILITY),
    },
    brainRepository: {
      findByKey: vi.fn().mockResolvedValue(BRAIN),
    },
    routingPolicyRepository: {
      findActiveByBrain: vi.fn().mockResolvedValue(overrides.policy ?? POLICY),
    },
    promptRepository: {
      findActiveByBrain: vi.fn().mockResolvedValue(PROMPT),
      findByBrainAndVersion: vi.fn(),
    },
    providerRepository: {
      findById: vi.fn(),
    },
    modelRepository: {
      findById: vi.fn(),
    },
    providerService: {
      resolveCredentials: vi.fn().mockResolvedValue(null),
    },
    usageService: {
      record: vi.fn().mockResolvedValue(undefined),
      recordPlayground: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function buildService(repos: ReturnType<typeof createRepositories>) {
  return new AiRoutingService(
    repos.capabilityRepository as never,
    repos.brainRepository as never,
    repos.routingPolicyRepository as never,
    repos.promptRepository as never,
    repos.providerRepository as never,
    repos.modelRepository as never,
    repos.providerService as never,
    repos.usageService as never
  );
}

describe("AiRoutingService", () => {
  beforeEach(() => {
    createProviderMock.mockReset();
  });

  it("invokeCapability() resolves Capability -> Brain and returns a VALID outcome on the happy path", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({ chat: vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", content: "hello", raw: {} }) });

    const result = await service.invokeCapability("lead-qualification", { name: "Acme" }, {}, "user-1");

    expect(result.outcome).toBe("VALID");
    expect(result.capability).toBe("lead-qualification");
    expect(result.brain).toBe("sales-brain");
    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("qwen2.5-coder:7b");
    expect(result.retryCount).toBe(0);
    expect(result.needsManualReview).toBe(false);
    expect(repos.usageService.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "VALID", capabilityId: "cap-1", brainId: "brain-1" })
    );
  });

  it("substitutes {{placeholder}} tokens from input into the prompt body", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    const chat = vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", content: "ok", raw: {} });
    createProviderMock.mockReturnValue({ chat });

    await service.invokeCapability("lead-qualification", { name: "Acme Corp" }, {}, "user-1");

    const [messages] = chat.mock.calls[0] as [Array<{ role: string; content: string }>];
    expect(messages[0]?.content).toBe("Analyze: Acme Corp");
  });

  it("SCHEMA_INVALID: retries with corrective feedback, then succeeds", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    const chat = vi
      .fn()
      .mockResolvedValueOnce({ model: "m", content: "not json", raw: {} })
      .mockResolvedValueOnce({ model: "m", content: '{"confidence": 0.9}', raw: {} });
    createProviderMock.mockReturnValue({ chat });

    const result = await service.invokeCapability("lead-qualification", {}, { expectJson: true }, "user-1");

    expect(result.outcome).toBe("VALID");
    expect(result.retryCount).toBe(1);
    expect(chat).toHaveBeenCalledTimes(2);
    const [, secondCallArgs] = chat.mock.calls;
    const secondMessages = secondCallArgs[0] as Array<{ role: string; content: string }>;
    expect(secondMessages.some((m) => m.role === "assistant" && m.content === "not json")).toBe(true);
  });

  it("DEFINITIVE_FAILURE: a 4xx error skips retries entirely and needsManualReview is true", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    const { AiProviderCallError } = await import("../errors/ai-core-provider.error.js");
    const chat = vi.fn().mockRejectedValue(new AiProviderCallError("ollama", "model not found", 404));
    createProviderMock.mockReturnValue({ chat });

    const result = await service.invokeCapability("lead-qualification", {}, {}, "user-1");

    expect(result.outcome).toBe("DEFINITIVE_FAILURE");
    expect(result.retryCount).toBe(0);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(result.needsManualReview).toBe(true);
  });

  it("TRANSIENT_FAILURE: exhausts retries then attempts the configured fallback successfully", async () => {
    const repos = createRepositories({ policy: POLICY_WITH_FALLBACK });
    const service = buildService(repos);
    const { AiProviderCallError } = await import("../errors/ai-core-provider.error.js");

    const failingChat = vi.fn().mockRejectedValue(new AiProviderCallError("ollama", "connection refused"));
    const fallbackChat = vi.fn().mockResolvedValue({ model: "gpt-4o", content: "recovered", raw: {} });

    createProviderMock.mockImplementation((key: string) => (key === "ollama" ? { chat: failingChat } : { chat: fallbackChat }));

    const result = await service.invokeCapability("lead-qualification", {}, {}, "user-1");

    // maxRetries = 2 -> 3 attempts against preferred (0,1,2), then 1 fallback attempt
    expect(failingChat).toHaveBeenCalledTimes(3);
    expect(fallbackChat).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("VALID");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  it("never throws — returns needsManualReview:true when every attempt and fallback fail", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    const { AiProviderCallError } = await import("../errors/ai-core-provider.error.js");
    createProviderMock.mockReturnValue({ chat: vi.fn().mockRejectedValue(new AiProviderCallError("ollama", "timeout")) });

    const result = await service.invokeCapability("lead-qualification", {}, {}, "user-1");

    expect(result.needsManualReview).toBe(true);
    expect(result.outcome).toBe("TRANSIENT_FAILURE");
  });

  it("classifies confidence tiers against the routing policy's thresholds", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({
      chat: vi.fn().mockResolvedValue({ model: "m", content: '{"confidence": 0.5}', raw: {} }),
    });

    const result = await service.invokeCapability("lead-qualification", {}, { expectJson: true }, "user-1");

    expect(result.confidence).toBe("MEDIUM");
  });

  it("LOW confidence forces needsManualReview even on a VALID outcome", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({
      chat: vi.fn().mockResolvedValue({ model: "m", content: '{"confidence": 0.1}', raw: {} }),
    });

    const result = await service.invokeCapability("lead-qualification", {}, { expectJson: true }, "user-1");

    expect(result.outcome).toBe("VALID");
    expect(result.confidence).toBe("LOW");
    expect(result.needsManualReview).toBe(true);
  });

  it("caches the resolved Capability/Brain/Policy/Prompt chain across repeated invokes", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({ chat: vi.fn().mockResolvedValue({ model: "m", content: "ok", raw: {} }) });

    await service.invokeCapability("lead-qualification", {}, {}, "user-1");
    await service.invokeCapability("lead-qualification", {}, {}, "user-1");

    expect(repos.capabilityRepository.findByKeyWithBrain).toHaveBeenCalledTimes(1);
    expect(repos.routingPolicyRepository.findActiveByBrain).toHaveBeenCalledTimes(1);
  });

  it("clears the cache when an AI_CORE_CACHE_INVALIDATE event fires", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({ chat: vi.fn().mockResolvedValue({ model: "m", content: "ok", raw: {} }) });

    await service.invokeCapability("lead-qualification", {}, {}, "user-1");
    aiCoreCacheEvents.emit(AI_CORE_CACHE_INVALIDATE, { action: "PROMPT_VERSION_ACTIVATED" });
    await service.invokeCapability("lead-qualification", {}, {}, "user-1");

    expect(repos.capabilityRepository.findByKeyWithBrain).toHaveBeenCalledTimes(2);
  });

  it("invokeBrain() (administrative path) never resolves through AiCapability", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    createProviderMock.mockReturnValue({ chat: vi.fn().mockResolvedValue({ model: "m", content: "ok", raw: {} }) });

    const result = await service.invokeBrain("sales-brain", {}, {}, "user-1");

    expect(repos.capabilityRepository.findByKeyWithBrain).not.toHaveBeenCalled();
    expect(result.capability).toBeUndefined();
    expect(result.brain).toBe("sales-brain");
  });

  it("invokePlayground() with a provider/model override never mutates the cached chain", async () => {
    const repos = createRepositories();
    const service = buildService(repos);
    const overrideProvider = { id: "provider-3", key: "anthropic", baseUrl: null, kind: "HOSTED" } as never;
    const overrideModel = { id: "model-3", modelKey: "claude-3-5-sonnet" } as never;
    repos.providerRepository.findById.mockResolvedValue(overrideProvider);
    repos.modelRepository.findById.mockResolvedValue(overrideModel);

    createProviderMock.mockReturnValue({ chat: vi.fn().mockResolvedValue({ model: "m", content: "ok", raw: {} }) });

    const overrideResult = await service.invokePlayground({
      capabilityKey: "lead-qualification",
      input: {},
      overrides: { providerId: "provider-3", modelId: "model-3" },
      actorId: "admin-1",
    });
    expect(overrideResult.provider).toBe("anthropic");
    expect(repos.usageService.recordPlayground).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: "provider-3" })
    );

    // A subsequent normal Capability invoke still resolves the Brain's
    // actual configured provider — the override was never persisted.
    const normalResult = await service.invokeCapability("lead-qualification", {}, {}, "user-1");
    expect(normalResult.provider).toBe("ollama");
  });
});
