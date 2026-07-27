import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const findFirstMock = vi.fn();
const findUniqueMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    automationConnection: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
  },
}));

const { AutomationConnectionRepository } = await import(
  "./automation-connection.repository.js"
);

describe("AutomationConnectionRepository", () => {
  const repository = new AutomationConnectionRepository();

  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    findFirstMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates a connection, passing metadata through as JSON input", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      userId: "user-1",
      provider: "fake",
      label: "My Fake Connection",
      encryptedCredentials: "cipher-text",
      credentialsIv: "iv",
      metadata: { note: "test" },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        provider: "fake",
        label: "My Fake Connection",
        encryptedCredentials: "cipher-text",
        credentialsIv: "iv",
        metadata: { note: "test" },
      },
    });
  });

  it("updates a connection by id", async () => {
    updateMock.mockResolvedValue({});

    await repository.update("conn-1", { label: "Renamed" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { label: "Renamed", metadata: undefined },
    });
  });

  it("deletes a connection by id", async () => {
    deleteMock.mockResolvedValue({});

    await repository.delete("conn-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "conn-1" } });
  });

  it("finds a connection by id, scoped to its owner", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("conn-1", "user-1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "conn-1", userId: "user-1" },
    });
  });

  it("finds a connection by id with no ownership scoping (system-internal)", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findByIdForSystem("conn-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "conn-1" },
    });
  });

  it("finds all connections for a user, newest first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findByUserId("user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("finds connections for a user scoped to a provider", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findByProvider("user-1", "github");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "github" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("finds only ACTIVE connections for a user", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findActiveConnections("user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("updates status and lastVerifiedAt together when provided", async () => {
    updateMock.mockResolvedValue({});
    const verifiedAt = new Date("2026-01-01T00:00:00Z");

    await repository.updateStatus("conn-1", "ACTIVE", verifiedAt);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { status: "ACTIVE", lastVerifiedAt: verifiedAt },
    });
  });

  it("updates status without touching lastVerifiedAt when omitted", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateStatus("conn-1", "REVOKED");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { status: "REVOKED" },
    });
  });
});
