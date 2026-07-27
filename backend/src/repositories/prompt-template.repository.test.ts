import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    promptTemplate: {
      findMany: findManyMock,
    },
  },
}));

const { PromptTemplateRepository } = await import("./prompt-template.repository.js");

describe("PromptTemplateRepository.findMany", () => {
  const repository = new PromptTemplateRepository();

  beforeEach(() => {
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([]);
  });

  it("queries with no filters when none are provided", async () => {
    await repository.findMany({});

    expect(findManyMock).toHaveBeenCalledWith({
      where: { category: undefined, contentType: undefined },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  });

  it("filters by category only", async () => {
    await repository.findMany({ category: "Blogging" });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { category: "Blogging", contentType: undefined },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  });

  it("filters by contentType only", async () => {
    await repository.findMany({ contentType: "BLOG" });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { category: undefined, contentType: "BLOG" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  });

  it("filters by both category and contentType together", async () => {
    await repository.findMany({ category: "Blogging", contentType: "BLOG" });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { category: "Blogging", contentType: "BLOG" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  });

  it("always orders by category then name", async () => {
    await repository.findMany({});

    const call = findManyMock.mock.calls[0][0];
    expect(call.orderBy).toEqual([{ category: "asc" }, { name: "asc" }]);
  });

  it("returns whatever Prisma resolves with", async () => {
    const rows = [{ id: "tpl-1", name: "Blog Post" }];
    findManyMock.mockResolvedValue(rows);

    const result = await repository.findMany({});

    expect(result).toBe(rows);
  });
});
