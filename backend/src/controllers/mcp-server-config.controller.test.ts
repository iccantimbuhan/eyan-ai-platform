import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const listMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const checkHealthMock = vi.fn();
const listRegisteredMock = vi.fn();

vi.mock("../services/mcp-server-config.service.js", () => ({
  McpServerConfigService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      create: createMock,
      list: listMock,
      getById: getByIdMock,
      update: updateMock,
      delete: deleteMock,
    };
  }),
}));

vi.mock("../services/mcp-health.service.js", () => ({
  McpHealthService: vi.fn().mockImplementation(function (this: unknown) {
    return { checkHealth: checkHealthMock };
  }),
}));

vi.mock("../providers/mcp-connector.factory.js", () => ({
  McpConnectorFactory: { listRegistered: listRegisteredMock },
}));

const { McpServerConfigController } = await import(
  "./mcp-server-config.controller.js"
);

const SAMPLE_CONFIG = {
  id: "mcp-1",
  name: "Fake Server",
  provider: "fake",
  transport: "STDIO",
  command: null,
  args: [],
  url: null,
  connectionId: null,
  isEnabled: true,
  healthStatus: "UNKNOWN",
  lastHealthCheckAt: null,
  lastHealthMessage: null,
  config: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("McpServerConfigController", () => {
  beforeEach(() => {
    for (const mock of [
      createMock,
      listMock,
      getByIdMock,
      updateMock,
      deleteMock,
      checkHealthMock,
      listRegisteredMock,
    ]) {
      mock.mockReset();
    }
  });

  it("createServerConfig() forwards the body plus createdById to the service", async () => {
    createMock.mockResolvedValue(SAMPLE_CONFIG);
    const req = {
      user: { id: "user-1" },
      body: { name: "Fake Server", provider: "fake", transport: "STDIO" },
    } as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.createServerConfig(req, res);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Fake Server",
        provider: "fake",
        transport: "STDIO",
        createdById: "user-1",
      }),
      "user-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getServerConfigs() lists every config", async () => {
    listMock.mockResolvedValue([SAMPLE_CONFIG]);
    const req = {} as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.getServerConfigs(req, res);

    expect(listMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("listProviders() returns the McpConnectorFactory registry", async () => {
    listRegisteredMock.mockReturnValue(["fake"]);
    const req = {} as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.listProviders(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: ["fake"] })
    );
  });

  it("getServerConfig() propagates a NotFoundError from the service", async () => {
    getByIdMock.mockRejectedValue(new Error("MCP server config not found."));
    const req = { params: { id: "missing" } } as unknown as Request;
    const res = createResponse();

    await expect(
      McpServerConfigController.getServerConfig(req, res)
    ).rejects.toThrow("MCP server config not found.");
  });

  it("updateServerConfig() forwards the body to the service with actorId", async () => {
    updateMock.mockResolvedValue(SAMPLE_CONFIG);
    const req = {
      user: { id: "user-1" },
      params: { id: "mcp-1" },
      body: { isEnabled: false },
    } as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.updateServerConfig(req, res);

    expect(updateMock).toHaveBeenCalledWith(
      "mcp-1",
      expect.objectContaining({ isEnabled: false }),
      "user-1"
    );
  });

  it("deleteServerConfig() responds 200 with no data", async () => {
    deleteMock.mockResolvedValue(undefined);
    const req = {
      user: { id: "user-1" },
      params: { id: "mcp-1" },
    } as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.deleteServerConfig(req, res);

    expect(deleteMock).toHaveBeenCalledWith("mcp-1", "user-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });

  it("checkHealth() delegates to McpHealthService and returns its result", async () => {
    const healthResult = { status: "HEALTHY", checkedAt: new Date() };
    checkHealthMock.mockResolvedValue(healthResult);
    const req = {
      user: { id: "user-1" },
      params: { id: "mcp-1" },
    } as unknown as Request;
    const res = createResponse();

    await McpServerConfigController.checkHealth(req, res);

    expect(checkHealthMock).toHaveBeenCalledWith("mcp-1", "user-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: healthResult })
    );
  });
});
