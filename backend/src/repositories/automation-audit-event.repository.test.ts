import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    automationAuditEvent: {
      create: createMock,
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

const { AutomationAuditEventRepository } = await import(
  "./automation-audit-event.repository.js"
);

describe("AutomationAuditEventRepository", () => {
  const repository = new AutomationAuditEventRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    countMock.mockReset();
  });

  it("creates an audit event, passing metadata through as JSON input", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      actorId: "user-1",
      action: "CONNECTION_CREATED",
      targetType: "AutomationConnection",
      targetId: "conn-1",
      metadata: { provider: "fake" },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        action: "CONNECTION_CREATED",
        targetType: "AutomationConnection",
        targetId: "conn-1",
        metadata: { provider: "fake" },
      },
    });
  });

  it("finds events for a connection via findByTarget, paginated", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findByConnection("conn-1", { skip: 0, take: 20 });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { targetType: "AutomationConnection", targetId: "conn-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("finds events for an arbitrary target type, paginated", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findByTarget("McpServerConfig", "mcp-1", {
      skip: 10,
      take: 5,
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { targetType: "McpServerConfig", targetId: "mcp-1" },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 5,
    });
  });

  it("finds events for a user, paginated", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findByUser("user-1", { skip: 0, take: 20 });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { actorId: "user-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("finds recent events across every actor/target, paginated", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findRecent({ skip: 0, take: 50 });

    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 50,
    });
  });

  it("counts events for a target", async () => {
    countMock.mockResolvedValue(3);

    const total = await repository.countByTarget("AutomationConnection", "conn-1");

    expect(countMock).toHaveBeenCalledWith({
      where: { targetType: "AutomationConnection", targetId: "conn-1" },
    });
    expect(total).toBe(3);
  });

  it("counts events for a user", async () => {
    countMock.mockResolvedValue(7);

    const total = await repository.countByUser("user-1");

    expect(countMock).toHaveBeenCalledWith({ where: { actorId: "user-1" } });
    expect(total).toBe(7);
  });

  it("counts every event with no filter", async () => {
    countMock.mockResolvedValue(42);

    const total = await repository.count();

    expect(countMock).toHaveBeenCalledWith();
    expect(total).toBe(42);
  });
});
