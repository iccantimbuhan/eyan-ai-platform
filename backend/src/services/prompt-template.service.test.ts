import { describe, expect, it, vi } from "vitest";

import { PromptTemplateService } from "./prompt-template.service.js";

function createRepository(rows: unknown[] = []) {
  return { findMany: vi.fn().mockResolvedValue(rows) };
}

describe("PromptTemplateService.list", () => {
  it("delegates to the repository with the given filters", async () => {
    const repository = createRepository();
    const service = new PromptTemplateService(repository as never);

    await service.list({ category: "Blogging", contentType: "BLOG" });

    expect(repository.findMany).toHaveBeenCalledWith({
      category: "Blogging",
      contentType: "BLOG",
    });
  });

  it("passes undefined filters through when called with no query", async () => {
    const repository = createRepository();
    const service = new PromptTemplateService(repository as never);

    await service.list();

    expect(repository.findMany).toHaveBeenCalledWith({
      category: undefined,
      contentType: undefined,
    });
  });

  it("returns whatever the repository resolves with", async () => {
    const rows = [{ id: "tpl-1", name: "Blog Post" }];
    const repository = createRepository(rows);
    const service = new PromptTemplateService(repository as never);

    const result = await service.list();

    expect(result).toBe(rows);
  });
});
