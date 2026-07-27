import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const listMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../services/saved-prompt.service.js", () => ({
  SavedPromptService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      create: createMock,
      list: listMock,
      getById: getByIdMock,
      update: updateMock,
      delete: deleteMock,
    };
  }),
}));

const { SavedPromptController } = await import("./saved-prompt.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function requestAs(userId: string, overrides: Partial<Request> = {}) {
  return {
    user: { id: userId },
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

describe("SavedPromptController", () => {
  beforeEach(() => {
    createMock.mockReset();
    listMock.mockReset();
    getByIdMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  it("createSavedPrompt scopes creation to req.user.id", async () => {
    createMock.mockResolvedValue({ id: "sp-1" });
    const req = requestAs("user-1", {
      body: { name: "My Prompt", promptBody: "Write about {{topic}}.", contentType: "BLOG" },
    });
    const res = createResponse();

    await SavedPromptController.createSavedPrompt(req, res);

    expect(createMock).toHaveBeenCalledWith(req.body, "user-1");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getSavedPrompts scopes listing to req.user.id", async () => {
    listMock.mockResolvedValue([]);
    const req = requestAs("user-1");
    const res = createResponse();

    await SavedPromptController.getSavedPrompts(req, res);

    expect(listMock).toHaveBeenCalledWith("user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getSavedPrompt passes both the param id and req.user.id to the service", async () => {
    getByIdMock.mockResolvedValue({ id: "sp-1" });
    const req = requestAs("user-1", { params: { id: "sp-1" } });
    const res = createResponse();

    await SavedPromptController.getSavedPrompt(req, res);

    expect(getByIdMock).toHaveBeenCalledWith("sp-1", "user-1");
  });

  it("updateSavedPrompt passes id, body, and req.user.id to the service", async () => {
    updateMock.mockResolvedValue({ id: "sp-1" });
    const req = requestAs("user-1", {
      params: { id: "sp-1" },
      body: { name: "New Name" },
    });
    const res = createResponse();

    await SavedPromptController.updateSavedPrompt(req, res);

    expect(updateMock).toHaveBeenCalledWith("sp-1", { name: "New Name" }, "user-1");
  });

  it("deleteSavedPrompt passes id and req.user.id to the service", async () => {
    deleteMock.mockResolvedValue(undefined);
    const req = requestAs("user-1", { params: { id: "sp-1" } });
    const res = createResponse();

    await SavedPromptController.deleteSavedPrompt(req, res);

    expect(deleteMock).toHaveBeenCalledWith("sp-1", "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("never uses a different user's id even if one were somehow present in the body", async () => {
    listMock.mockResolvedValue([]);
    const req = requestAs("user-1", {
      body: { userId: "user-attacker" } as never,
    });
    const res = createResponse();

    await SavedPromptController.getSavedPrompts(req, res);

    expect(listMock).toHaveBeenCalledWith("user-1");
  });
});
