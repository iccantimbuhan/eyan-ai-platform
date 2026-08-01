import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../errors/api-error.js";

const { chatMock, streamChatMock, ollamaProviderCtor } = vi.hoisted(() => {
  const chatMock = vi.fn().mockResolvedValue({
    model: "qwen2.5-coder:7b",
    response: "hi",
    createdAt: "now",
  });
  const streamChatMock = vi.fn().mockResolvedValue({
    data: { on: vi.fn(), pipe: vi.fn() },
  });
  class FakeOllamaProvider {
    chat = chatMock;
    streamChat = streamChatMock;
  }
  const ollamaProviderCtor = vi.fn(function (this: unknown, ..._args: unknown[]) {
    return new FakeOllamaProvider();
  });
  return { chatMock, streamChatMock, ollamaProviderCtor };
});

vi.mock("../providers/ollama/ollama.provider.js", () => ({
  OllamaProvider: ollamaProviderCtor,
}));

const { ChatService } = await import("./chat.service.js");

function createCapabilityService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getByKeyWithBrain: vi.fn().mockResolvedValue({
      id: "cap-1",
      key: "general-chat",
      isEnabled: true,
      brain: { id: "brain-1", isEnabled: true },
    }),
    ...overrides,
  };
}

function createRoutingPolicyService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getActiveByBrain: vi.fn().mockResolvedValue({
      id: "policy-1",
      preferredProvider: { key: "ollama", baseUrl: "http://127.0.0.1:11434" },
      preferredModel: { modelKey: "qwen2.5-coder:7b" },
    }),
    ...overrides,
  };
}

describe("ChatService", () => {
  beforeEach(() => {
    chatMock.mockClear();
    streamChatMock.mockClear();
    ollamaProviderCtor.mockClear();
  });

  it("resolves provider/model from the general-chat Capability's active Brain/RoutingPolicy before calling chat()", async () => {
    const capabilityService = createCapabilityService();
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    const result = await service.chat([{ role: "user", content: "hi" }]);

    expect(capabilityService.getByKeyWithBrain).toHaveBeenCalledWith("general-chat");
    expect(routingPolicyService.getActiveByBrain).toHaveBeenCalledWith("brain-1");
    expect(ollamaProviderCtor).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen2.5-coder:7b",
    });
    expect(result).toEqual({ model: "qwen2.5-coder:7b", response: "hi", createdAt: "now" });
  });

  it("resolves the provider only once per instance across chat() and stream() calls", async () => {
    const capabilityService = createCapabilityService();
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await service.chat([{ role: "user", content: "hi" }]);
    await service.chat([{ role: "user", content: "hi again" }]);

    expect(capabilityService.getByKeyWithBrain).toHaveBeenCalledTimes(1);
    expect(ollamaProviderCtor).toHaveBeenCalledTimes(1);
  });

  it("throws a 503 ApiError when the Capability does not exist", async () => {
    const capabilityService = createCapabilityService({ getByKeyWithBrain: vi.fn().mockResolvedValue(null) });
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toThrow(ApiError);
  });

  it("throws a 503 ApiError when the Capability is disabled", async () => {
    const capabilityService = createCapabilityService({
      getByKeyWithBrain: vi.fn().mockResolvedValue({
        id: "cap-1",
        isEnabled: false,
        brain: { id: "brain-1", isEnabled: true },
      }),
    });
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toThrow(ApiError);
  });

  it("throws a 503 ApiError when the Brain is disabled", async () => {
    const capabilityService = createCapabilityService({
      getByKeyWithBrain: vi.fn().mockResolvedValue({
        id: "cap-1",
        isEnabled: true,
        brain: { id: "brain-1", isEnabled: false },
      }),
    });
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toThrow(ApiError);
  });

  it("throws a 503 ApiError when the Brain has no active RoutingPolicy", async () => {
    const capabilityService = createCapabilityService();
    const routingPolicyService = createRoutingPolicyService({
      getActiveByBrain: vi.fn().mockResolvedValue(null),
    });
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toThrow(ApiError);
  });

  it("throws a 503 ApiError when the active RoutingPolicy's provider is not Ollama (unsupported execution path)", async () => {
    const capabilityService = createCapabilityService();
    const routingPolicyService = createRoutingPolicyService({
      getActiveByBrain: vi.fn().mockResolvedValue({
        id: "policy-1",
        preferredProvider: { key: "openai", baseUrl: null },
        preferredModel: { modelKey: "gpt-4o" },
      }),
    });
    const service = new ChatService(capabilityService as never, routingPolicyService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toThrow(ApiError);
    expect(ollamaProviderCtor).not.toHaveBeenCalled();
  });

  it("stream() resolves the same way and pipes the provider's stream response", async () => {
    const capabilityService = createCapabilityService();
    const routingPolicyService = createRoutingPolicyService();
    const service = new ChatService(capabilityService as never, routingPolicyService as never);
    const res = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      destroyed: false,
      destroy: vi.fn(),
    };

    await service.stream([{ role: "user", content: "hi" }], res as never);

    expect(streamChatMock).toHaveBeenCalled();
    expect(res.flushHeaders).toHaveBeenCalled();
  });
});
