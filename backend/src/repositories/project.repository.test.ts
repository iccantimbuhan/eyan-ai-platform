import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    contentProject: {
      create: createMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
      count: countMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

const { ProjectRepository } = await import("./project.repository.js");

describe("ProjectRepository", () => {
  const repository = new ProjectRepository();

  beforeEach(() => {
    createMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    countMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  it("creates a project scoped to the given userId", async () => {
    createMock.mockResolvedValue({ id: "proj-1" });

    await repository.create({
      userId: "user-1",
      name: "My Project",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "My Project" },
    });
  });

  it("scopes findById to both the id and the requesting userId", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("proj-1", "user-2");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "proj-1", userId: "user-2" },
    });
  });

  it("scopes findMany to the requesting userId", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany({ userId: "user-1", skip: 0, take: 20 });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      skip: 0,
      take: 20,
      orderBy: { updatedAt: "desc" },
    });
  });

  it("scopes count to the requesting userId", async () => {
    countMock.mockResolvedValue(0);

    await repository.count("user-1");

    expect(countMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
