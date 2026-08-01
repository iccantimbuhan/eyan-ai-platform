import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findUniqueMock = vi.fn();
const messageCreateMock = vi.fn();
const createManyMock = vi.fn();
const updateMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    aiConversation: {
      create: createMock,
      findUnique: findUniqueMock,
      update: updateMock,
      findMany: findManyMock,
    },
    aiConversationMessage: {
      create: messageCreateMock,
      createMany: createManyMock,
    },
  },
}));

const { AiConversationRepository } = await import("./ai-conversation.repository.js");

describe("AiConversationRepository", () => {
  const repository = new AiConversationRepository();

  beforeEach(() => {
    createMock.mockReset();
    findUniqueMock.mockReset();
    messageCreateMock.mockReset();
    createManyMock.mockReset();
    updateMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates a conversation for a brain", async () => {
    createMock.mockResolvedValue({ id: "conv-1" });

    await repository.create({ brainId: "brain-1" });

    expect(createMock).toHaveBeenCalledWith({ data: { brainId: "brain-1", metadata: undefined } });
  });

  it("finds a conversation with its messages ordered oldest-first", async () => {
    findUniqueMock.mockResolvedValue({ id: "conv-1", messages: [] });

    await repository.findByIdWithMessages("conv-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });

  it("appends a single message", async () => {
    messageCreateMock.mockResolvedValue({});

    await repository.appendMessage({ conversationId: "conv-1", role: "USER", content: "hi" });

    expect(messageCreateMock).toHaveBeenCalledWith({
      data: { conversationId: "conv-1", role: "USER", content: "hi" },
    });
  });

  it("appends multiple messages in one call", async () => {
    await repository.appendMessages([
      { conversationId: "conv-1", role: "SYSTEM", content: "sys" },
      { conversationId: "conv-1", role: "USER", content: "hi" },
    ]);

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        { conversationId: "conv-1", role: "SYSTEM", content: "sys" },
        { conversationId: "conv-1", role: "USER", content: "hi" },
      ],
    });
  });

  it("skips the createMany call entirely for an empty message list", async () => {
    await repository.appendMessages([]);

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("touches a conversation's updatedAt", async () => {
    updateMock.mockResolvedValue({});

    await repository.touch("conv-1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it("lists conversations for a brain, most recently active first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.listByBrain("brain-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { brainId: "brain-1" },
      orderBy: { updatedAt: "desc" },
    });
  });
});
