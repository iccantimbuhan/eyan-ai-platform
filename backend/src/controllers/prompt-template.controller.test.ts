import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();

vi.mock("../services/prompt-template.service.js", () => ({
  PromptTemplateService: vi.fn().mockImplementation(function (this: unknown) {
    return { list: listMock };
  }),
}));

const { PromptTemplateController } = await import(
  "./prompt-template.controller.js"
);

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("PromptTemplateController.getTemplates", () => {
  beforeEach(() => {
    listMock.mockReset();
    listMock.mockResolvedValue([]);
  });

  it("passes category and contentType query params through to the service", async () => {
    const req = {
      query: { category: "Blogging", contentType: "BLOG" },
    } as unknown as Request;
    const res = createResponse();

    await PromptTemplateController.getTemplates(req, res);

    expect(listMock).toHaveBeenCalledWith({
      category: "Blogging",
      contentType: "BLOG",
    });
  });

  it("passes undefined filters through when no query params are given", async () => {
    const req = { query: {} } as unknown as Request;
    const res = createResponse();

    await PromptTemplateController.getTemplates(req, res);

    expect(listMock).toHaveBeenCalledWith({
      category: undefined,
      contentType: undefined,
    });
  });

  it("responds with a 200 success envelope containing the templates", async () => {
    const templates = [{ id: "tpl-1", name: "Blog Post" }];
    listMock.mockResolvedValue(templates);

    const req = { query: {} } as unknown as Request;
    const res = createResponse();

    await PromptTemplateController.getTemplates(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Prompt templates retrieved successfully.",
      data: templates,
    });
  });
});
