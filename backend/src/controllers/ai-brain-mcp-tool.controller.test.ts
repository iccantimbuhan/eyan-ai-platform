import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const allowMock = vi.fn();
const revokeMock = vi.fn();
const listByBrainMock = vi.fn();

vi.mock("../services/ai-brain-mcp-tool.service.js", () => ({
  aiBrainMcpToolService: {
    allow: allowMock,
    revoke: revokeMock,
    listByBrain: listByBrainMock,
  },
}));

const { AiBrainMcpToolController } = await import("./ai-brain-mcp-tool.controller.js");

const SAMPLE_ALLOWANCE = {
  id: "allowance-1",
  brainId: "brain-1",
  mcpServerConfigId: "server-1",
  allowedTools: ["search"],
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("AiBrainMcpToolController", () => {
  beforeEach(() => {
    for (const mock of [allowMock, revokeMock, listByBrainMock]) {
      mock.mockReset();
    }
  });

  it("allow() forwards brainId, mcpServerConfigId, allowedTools, and the caller's user id as actor", async () => {
    allowMock.mockResolvedValue(SAMPLE_ALLOWANCE);
    const req = {
      params: { brainId: "brain-1" },
      body: { mcpServerConfigId: "server-1", allowedTools: ["search"] },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await AiBrainMcpToolController.allow(req, res);

    expect(allowMock).toHaveBeenCalledWith(
      { brainId: "brain-1", mcpServerConfigId: "server-1", allowedTools: ["search"] },
      "user-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ id: "allowance-1" }) })
    );
  });

  it("revoke() deletes by mcpToolId, scoped to the brain, with the caller as actor", async () => {
    revokeMock.mockResolvedValue(undefined);
    const req = { params: { brainId: "brain-1", mcpToolId: "allowance-1" }, user: { id: "user-1" } } as unknown as Request;
    const res = createResponse();

    await AiBrainMcpToolController.revoke(req, res);

    expect(revokeMock).toHaveBeenCalledWith("allowance-1", "brain-1", "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("list() returns every allowance for the brain mapped to its response DTO", async () => {
    listByBrainMock.mockResolvedValue([SAMPLE_ALLOWANCE]);
    const req = { params: { brainId: "brain-1" } } as unknown as Request;
    const res = createResponse();

    await AiBrainMcpToolController.list(req, res);

    expect(listByBrainMock).toHaveBeenCalledWith("brain-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ id: "allowance-1", mcpServerConfigId: "server-1" })] })
    );
  });
});
