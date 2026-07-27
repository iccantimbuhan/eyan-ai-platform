import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    brandKit: {
      create: createMock,
      findMany: findManyMock,
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

const { BrandKitRepository } = await import("./brand-kit.repository.js");

describe("BrandKitRepository", () => {
  const repository = new BrandKitRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    findFirstMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  it("creates a brand kit scoped to the given project and creator", async () => {
    createMock.mockResolvedValue({ id: "bk-1" });

    await repository.create({
      projectId: "project-1",
      createdBy: "user-1",
      name: "Acme",
      logos: [{ url: "https://cdn.example.com/logo.png" }],
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        createdBy: "user-1",
        name: "Acme",
        logos: [{ url: "https://cdn.example.com/logo.png" }],
        primaryColors: undefined,
        secondaryColors: undefined,
        fonts: undefined,
      },
    });
  });

  it("scopes findById to both the id and the requesting user's project ownership", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("bk-1", "user-1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "bk-1", project: { userId: "user-1" } },
    });
  });

  it("lists only brand kits scoped to the given project and user, most recently updated first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyByProject("project-1", "user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1", project: { userId: "user-1" } },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("updates only the provided fields", async () => {
    updateMock.mockResolvedValue({ id: "bk-1" });

    await repository.update("bk-1", { name: "New Name" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "bk-1" },
      data: {
        name: "New Name",
        logos: undefined,
        primaryColors: undefined,
        secondaryColors: undefined,
        fonts: undefined,
      },
    });
  });

  it("deletes by id", async () => {
    deleteMock.mockResolvedValue({ id: "bk-1" });

    await repository.delete("bk-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "bk-1" } });
  });
});
