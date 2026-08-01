import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatService } from "./chat.service.js";
import { ApiError } from "../errors/api-error.js";
import { AiConversationError } from "../errors/ai-core-provider.error.js";
import { logger } from "../lib/logger.js";

function createConversationService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    converse: vi.fn().mockResolvedValue({
      conversationId: "conv-1",
      content: "hi there",
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      brain: "general-chat-brain",
      latencyMs: 10,
    }),
    streamConverse: vi.fn(),
    ...overrides,
  };
}

async function* asyncChunks(chunks: unknown[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function createRes() {
  return {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    destroyed: false,
    destroy: vi.fn(),
  };
}

describe("ChatService.chat", () => {
  it("delegates to AiConversationService.converse() with the general-chat Brain and returns the shaped result", async () => {
    const conversationService = createConversationService();
    const service = new ChatService(conversationService as never);

    const result = await service.chat([{ role: "user", content: "hi" }], undefined, "user-1");

    expect(conversationService.converse).toHaveBeenCalledWith({
      brainKey: "general-chat-brain",
      conversationId: undefined,
      messages: [{ role: "user", content: "hi" }],
      actorId: "user-1",
    });
    expect(result).toEqual({
      model: "qwen2.5-coder:7b",
      response: "hi there",
      createdAt: expect.any(String),
      conversationId: "conv-1",
    });
  });

  it("forwards a supplied conversationId so a continued conversation is possible", async () => {
    const conversationService = createConversationService();
    const service = new ChatService(conversationService as never);

    await service.chat([{ role: "user", content: "and then?" }], "conv-1", null);

    expect(conversationService.converse).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv-1" })
    );
  });

  it("propagates an AiConversationError from AiConversationService unchanged (already classified)", async () => {
    const conversationService = createConversationService({
      converse: vi.fn().mockRejectedValue(new AiConversationError(503, "The AI model is still loading — please try again in a moment.", "MODEL_LOADING")),
    });
    const service = new ChatService(conversationService as never);

    await expect(service.chat([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      statusCode: 503,
      category: "MODEL_LOADING",
    });
  });
});

describe("ChatService.stream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes each chunk's raw payload as one NDJSON line and sets the conversation id header", async () => {
    const chunks = [
      { delta: "hi", done: false, raw: { message: { content: "hi" }, done: false }, conversationId: "conv-1" },
      { delta: "", done: true, raw: { message: { content: "" }, done: true }, conversationId: "conv-1" },
    ];
    const conversationService = createConversationService({
      streamConverse: vi.fn().mockReturnValue(asyncChunks(chunks)),
    });
    const service = new ChatService(conversationService as never);
    const res = createRes();

    await service.stream([{ role: "user", content: "hi" }], res as never, undefined, null);

    expect(res.setHeader).toHaveBeenCalledWith("X-Ai-Conversation-Id", "conv-1");
    expect(res.write).toHaveBeenNthCalledWith(1, `${JSON.stringify(chunks[0].raw)}\n`);
    expect(res.write).toHaveBeenNthCalledWith(2, `${JSON.stringify(chunks[1].raw)}\n`);
    expect(res.end).toHaveBeenCalled();
  });

  it("throws (never writes to res) when streamConverse fails before any chunk is produced", async () => {
    const conversationService = createConversationService({
      streamConverse: vi.fn().mockReturnValue(
        (async function* () {
          throw new AiConversationError(503, "Unable to connect to the AI provider. Please try again shortly.", "PROVIDER_UNAVAILABLE");
        })()
      ),
    });
    const service = new ChatService(conversationService as never);
    const res = createRes();

    await expect(service.stream([{ role: "user", content: "hi" }], res as never)).rejects.toBeInstanceOf(ApiError);
    expect(res.write).not.toHaveBeenCalled();
    expect(res.destroy).not.toHaveBeenCalled();
  });

  it("destroys the response instead of throwing when the stream breaks mid-response (headers already sent)", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const conversationService = createConversationService({
      streamConverse: vi.fn().mockReturnValue(
        (async function* () {
          yield { delta: "hi", done: false, raw: { message: { content: "hi" }, done: false }, conversationId: "conv-1" };
          throw new Error("upstream connection reset");
        })()
      ),
    });
    const service = new ChatService(conversationService as never);
    const res = createRes();

    await expect(service.stream([{ role: "user", content: "hi" }], res as never)).resolves.toBeUndefined();

    expect(res.write).toHaveBeenCalledTimes(1);
    expect(res.destroy).toHaveBeenCalledWith(expect.any(Error));
    errorSpy.mockRestore();
  });
});
