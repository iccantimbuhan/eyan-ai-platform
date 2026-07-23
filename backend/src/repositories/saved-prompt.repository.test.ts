import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    savedPrompt: {
      create: createMock,
      findMany: findManyMock,
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

const { SavedPromptRepository } = await import("./saved-prompt.repository.js");

describe("SavedPromptRepository", () => {
  const repository = new SavedPromptRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    findFirstMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  it("creates a prompt scoped to the given userId", async () => {
    createMock.mockResolvedValue({ id: "sp-1" });

    await repository.create({
      userId: "user-1",
      name: "My Prompt",
      promptBody: "Write about {{topic}}.",
      contentType: "BLOG",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "My Prompt",
        promptBody: "Write about {{topic}}.",
        contentType: "BLOG",
      },
    });
  });

  it("lists only the given user's prompts, most recently updated first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany("user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("scopes findById to both the id and the requesting userId", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("sp-1", "user-1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "sp-1", userId: "user-1" },
    });
  });

  it("does not return another user's prompt from findById", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await repository.findById("sp-1", "user-2");

    expect(result).toBeNull();
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "sp-1", userId: "user-2" },
    });
  });

  it("updates only the provided fields", async () => {
    updateMock.mockResolvedValue({ id: "sp-1" });

    await repository.update("sp-1", { name: "New Name" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { name: "New Name" },
    });
  });

  it("deletes by id", async () => {
    deleteMock.mockResolvedValue({ id: "sp-1" });

    await repository.delete("sp-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "sp-1" } });
  });
});
