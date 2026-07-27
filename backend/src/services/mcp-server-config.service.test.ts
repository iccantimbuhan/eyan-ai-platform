import { describe, expect, it, vi } from "vitest";

import { McpServerConfigService } from "./mcp-server-config.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "mcp-1", provider: "fake" }),
    update: vi.fn().mockResolvedValue({ id: "mcp-1" }),
    delete: vi.fn().mockResolvedValue({ id: "mcp-1" }),
    findById: vi
      .fn()
      .mockResolvedValue({ id: "mcp-1", provider: "fake" }),
    findAll: vi.fn().mockResolvedValue([]),
    findEnabled: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createAuditService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    record: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("McpServerConfigService", () => {
  it("create() writes through the repository and audits MCP_SERVER_REGISTERED", async () => {
    const repository = createRepository();
    const auditService = createAuditService();
    const service = new McpServerConfigService(
      repository as never,
      auditService as never
    );

    await service.create(
      { name: "Fake Server", provider: "fake", transport: "STDIO", createdById: "user-1" },
      "user-1"
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: "Fake Server",
      provider: "fake",
      transport: "STDIO",
      createdById: "user-1",
    });
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: "user-1",
      action: "MCP_SERVER_REGISTERED",
      targetType: "McpServerConfig",
      targetId: "mcp-1",
      metadata: { provider: "fake" },
    });
  });

  it("update() throws NotFoundError when the config does not exist", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new McpServerConfigService(
      repository as never,
      createAuditService() as never
    );

    await expect(
      service.update("mcp-1", { name: "New Name" }, "user-1")
    ).rejects.toThrow("MCP server config not found.");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("update() writes through and audits MCP_SERVER_UPDATED once found", async () => {
    const repository = createRepository();
    const auditService = createAuditService();
    const service = new McpServerConfigService(
      repository as never,
      auditService as never
    );

    await service.update("mcp-1", { name: "New Name" }, "user-1");

    expect(repository.update).toHaveBeenCalledWith("mcp-1", {
      name: "New Name",
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MCP_SERVER_UPDATED" })
    );
  });

  it("delete() removes the row and audits MCP_SERVER_REMOVED", async () => {
    const repository = createRepository();
    const auditService = createAuditService();
    const service = new McpServerConfigService(
      repository as never,
      auditService as never
    );

    await service.delete("mcp-1", "user-1");

    expect(repository.delete).toHaveBeenCalledWith("mcp-1");
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MCP_SERVER_REMOVED" })
    );
  });

  it("delete() throws NotFoundError when the config does not exist", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new McpServerConfigService(
      repository as never,
      createAuditService() as never
    );

    await expect(service.delete("mcp-1", "user-1")).rejects.toThrow(
      "MCP server config not found."
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("getById() throws NotFoundError when the config does not exist", async () => {
    const repository = createRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new McpServerConfigService(
      repository as never,
      createAuditService() as never
    );

    await expect(service.getById("mcp-1")).rejects.toThrow(
      "MCP server config not found."
    );
  });

  it("list() delegates to the repository", async () => {
    const repository = createRepository();
    const service = new McpServerConfigService(
      repository as never,
      createAuditService() as never
    );

    await service.list();

    expect(repository.findAll).toHaveBeenCalled();
  });

  it("listEnabled() delegates to the repository", async () => {
    const repository = createRepository();
    const service = new McpServerConfigService(
      repository as never,
      createAuditService() as never
    );

    await service.listEnabled();

    expect(repository.findEnabled).toHaveBeenCalled();
  });
});
