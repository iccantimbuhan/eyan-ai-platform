import { describe, expect, it, vi } from "vitest";

import { AutomationAuditService } from "./automation-audit.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "evt-1" }),
    findByConnection: vi.fn().mockResolvedValue([]),
    findByTarget: vi.fn().mockResolvedValue([]),
    findByUser: vi.fn().mockResolvedValue([]),
    findRecent: vi.fn().mockResolvedValue([]),
    countByTarget: vi.fn().mockResolvedValue(0),
    countByUser: vi.fn().mockResolvedValue(0),
    count: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("AutomationAuditService", () => {
  it("record() writes straight through to the repository", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.record({
      actorId: "user-1",
      action: "CONNECTION_CREATED",
      targetType: "AutomationConnection",
      targetId: "conn-1",
    });

    expect(repository.create).toHaveBeenCalledWith({
      actorId: "user-1",
      action: "CONNECTION_CREATED",
      targetType: "AutomationConnection",
      targetId: "conn-1",
    });
  });

  it("listByConnection() paginates via findByTarget-style query and counts by target", async () => {
    const repository = createRepository({
      findByConnection: vi.fn().mockResolvedValue([{ id: "evt-1" }]),
      countByTarget: vi.fn().mockResolvedValue(1),
    });
    const service = new AutomationAuditService(repository as never);

    const result = await service.listByConnection("conn-1", 1, 10);

    expect(repository.findByConnection).toHaveBeenCalledWith("conn-1", {
      skip: 0,
      take: 10,
    });
    expect(repository.countByTarget).toHaveBeenCalledWith(
      "AutomationConnection",
      "conn-1"
    );
    expect(result).toEqual({
      data: [{ id: "evt-1" }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it("listByTarget() supports arbitrary target types", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listByTarget("McpServerConfig", "mcp-1", 2, 5);

    expect(repository.findByTarget).toHaveBeenCalledWith(
      "McpServerConfig",
      "mcp-1",
      { skip: 5, take: 5 }
    );
    expect(repository.countByTarget).toHaveBeenCalledWith(
      "McpServerConfig",
      "mcp-1"
    );
  });

  it("listByUser() paginates and counts by user", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listByUser("user-1", 3, 20);

    expect(repository.findByUser).toHaveBeenCalledWith("user-1", {
      skip: 40,
      take: 20,
    });
    expect(repository.countByUser).toHaveBeenCalledWith("user-1");
  });

  it("listRecent() paginates across every actor/target", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listRecent();

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 20 });
    expect(repository.count).toHaveBeenCalled();
  });

  it("clamps page below 1 up to 1", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listRecent(0, 10);

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 10 });
  });

  it("clamps pageSize above the maximum down to 100", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listRecent(1, 500);

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 100 });
  });

  it("clamps pageSize below 1 up to 1", async () => {
    const repository = createRepository();
    const service = new AutomationAuditService(repository as never);

    await service.listRecent(1, 0);

    expect(repository.findRecent).toHaveBeenCalledWith({ skip: 0, take: 1 });
  });
});
