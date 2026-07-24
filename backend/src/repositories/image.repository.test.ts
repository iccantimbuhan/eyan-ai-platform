import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const updateMock = vi.fn();
const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    generatedImage: {
      create: createMock,
      update: updateMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
      count: countMock,
      delete: deleteMock,
    },
  },
}));

const { ImageRepository } = await import("./image.repository.js");

describe("ImageRepository", () => {
  const repository = new ImageRepository();

  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    countMock.mockReset();
    deleteMock.mockReset();
  });

  it("creates an image row with the given data", async () => {
    createMock.mockResolvedValue({ id: "image-1" });

    await repository.create({
      projectId: "proj-1",
      prompt: "A cat",
      negativePrompt: null,
      provider: "fake",
      width: 512,
      height: 512,
      format: "PNG",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        prompt: "A cat",
        negativePrompt: null,
        provider: "fake",
        width: 512,
        height: 512,
        format: "PNG",
      },
    });
  });

  it("updates only the provided fields", async () => {
    updateMock.mockResolvedValue({ id: "image-1" });

    await repository.update("image-1", {
      status: "COMPLETED",
      model: "fake-image-v1",
      storagePath: "proj-1/uuid.png",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "image-1" },
      data: {
        status: "COMPLETED",
        model: "fake-image-v1",
        storagePath: "proj-1/uuid.png",
      },
    });
  });

  it("forwards generationTimeMs when provided", async () => {
    updateMock.mockResolvedValue({ id: "image-1" });

    await repository.update("image-1", {
      status: "COMPLETED",
      generationTimeMs: 4200,
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "image-1" },
      data: { status: "COMPLETED", generationTimeMs: 4200 },
    });
  });

  it("scopes findById to the id and the owning project's userId", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("image-1", "user-2");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "image-1", project: { userId: "user-2" } },
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

  it("deletes by id", async () => {
    deleteMock.mockResolvedValue({ id: "image-1" });

    await repository.delete("image-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "image-1" } });
  });
});
