import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const createMock = vi.fn();
const listMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../services/ai-capability.service.js", () => ({
  aiCapabilityService: {
    invoke: invokeMock,
    create: createMock,
    list: listMock,
    getById: getByIdMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

const { AiCapabilityController } = await import("./ai-capability.controller.js");

const SAMPLE_CAPABILITY = {
  id: "cap-1",
  key: "lead-qualification",
  name: "Lead Qualification",
  description: "Qualify inbound leads.",
  brainId: "brain-1",
  isEnabled: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("AiCapabilityController", () => {
  beforeEach(() => {
    for (const mock of [invokeMock, createMock, listMock, getByIdMock, updateMock, deleteMock]) {
      mock.mockReset();
    }
  });

  it("invoke() forwards capabilityKey, input, context, and the caller's user id", async () => {
    invokeMock.mockResolvedValue({ output: "ok", brain: "sales-brain", outcome: "VALID" });
    const req = {
      params: { capabilityKey: "lead-qualification" },
      body: { input: { name: "Acme" }, context: { expectJson: true } },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await AiCapabilityController.invoke(req, res);

    expect(invokeMock).toHaveBeenCalledWith("lead-qualification", { name: "Acme" }, { expectJson: true }, "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("create() forwards the body and the caller's user id as actor", async () => {
    createMock.mockResolvedValue(SAMPLE_CAPABILITY);
    const req = {
      body: { key: "lead-qualification", name: "Lead Qualification", description: "x", brainId: "brain-1", isEnabled: true },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await AiCapabilityController.create(req, res);

    expect(createMock).toHaveBeenCalledWith(
      { key: "lead-qualification", name: "Lead Qualification", description: "x", brainId: "brain-1", isEnabled: true },
      "user-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ key: "lead-qualification" }) })
    );
  });

  it("list() returns every capability mapped to its response DTO", async () => {
    listMock.mockResolvedValue([SAMPLE_CAPABILITY]);
    const req = {} as Request;
    const res = createResponse();

    await AiCapabilityController.list(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ id: "cap-1", key: "lead-qualification" })] })
    );
  });

  it("remove() deletes by id with the caller as actor", async () => {
    deleteMock.mockResolvedValue(undefined);
    const req = { params: { id: "cap-1" }, user: { id: "user-1" } } as unknown as Request;
    const res = createResponse();

    await AiCapabilityController.remove(req, res);

    expect(deleteMock).toHaveBeenCalledWith("cap-1", "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
