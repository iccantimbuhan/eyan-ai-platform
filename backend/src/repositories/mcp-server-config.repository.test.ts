import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const findUniqueMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    mcpServerConfig: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
  },
}));

const { McpServerConfigRepository } = await import(
  "./mcp-server-config.repository.js"
);

describe("McpServerConfigRepository", () => {
  const repository = new McpServerConfigRepository();

  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates a server config, passing config through as JSON input", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      name: "My Fake Server",
      provider: "fake",
      transport: "STDIO",
      createdById: "user-1",
      config: { verbose: true },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "My Fake Server",
        provider: "fake",
        transport: "STDIO",
        createdById: "user-1",
        config: { verbose: true },
      },
    });
  });

  it("updates a server config by id", async () => {
    updateMock.mockResolvedValue({});

    await repository.update("mcp-1", { isEnabled: false });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "mcp-1" },
      data: { isEnabled: false, config: undefined },
    });
  });

  it("deletes a server config by id", async () => {
    deleteMock.mockResolvedValue({});

    await repository.delete("mcp-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "mcp-1" } });
  });

  it("finds a server config by id", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findById("mcp-1");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: "mcp-1" } });
  });

  it("finds all server configs, newest first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findAll();

    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("finds only enabled server configs", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findEnabled();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { isEnabled: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("updates health status and message", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateHealthStatus("mcp-1", "HEALTHY", "All good.");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "mcp-1" },
      data: { healthStatus: "HEALTHY", lastHealthMessage: "All good." },
    });
  });

  it("defaults health message to null when omitted", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateHealthStatus("mcp-1", "UNREACHABLE");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "mcp-1" },
      data: { healthStatus: "UNREACHABLE", lastHealthMessage: null },
    });
  });

  it("updates only lastHealthCheckAt, independent of status", async () => {
    updateMock.mockResolvedValue({});
    const checkedAt = new Date("2026-01-01T00:00:00Z");

    await repository.updateLastHealthCheck("mcp-1", checkedAt);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "mcp-1" },
      data: { lastHealthCheckAt: checkedAt },
    });
  });
});
