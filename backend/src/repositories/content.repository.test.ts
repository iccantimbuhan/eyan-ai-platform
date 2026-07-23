import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    generatedContent: {
      create: createMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
      count: countMock,
      delete: deleteMock,
    },
  },
}));

const { ContentRepository } = await import("./content.repository.js");

describe("ContentRepository", () => {
  const repository = new ContentRepository();

  beforeEach(() => {
    createMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    countMock.mockReset();
    deleteMock.mockReset();
  });

  it("scopes findById to the id and the owning project's userId", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("content-1", "user-2");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "content-1", project: { userId: "user-2" } },
    });
  });

  it("scopes findMany to the project and the owning project's userId", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany({
      projectId: "proj-1",
      userId: "user-1",
      skip: 0,
      take: 20,
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "proj-1", project: { userId: "user-1" } },
      skip: 0,
      take: 20,
      orderBy: { createdAt: "desc" },
    });
  });

  it("scopes count to the project and the owning project's userId", async () => {
    countMock.mockResolvedValue(0);

    await repository.count("proj-1", "user-1");

    expect(countMock).toHaveBeenCalledWith({
      where: { projectId: "proj-1", project: { userId: "user-1" } },
    });
  });
});
