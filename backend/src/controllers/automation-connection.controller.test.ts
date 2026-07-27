import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const listForUserMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const rotateCredentialsMock = vi.fn();
const enableMock = vi.fn();
const disableMock = vi.fn();

vi.mock("../services/automation-connection.service.js", () => ({
  AutomationConnectionService: vi.fn().mockImplementation(function (
    this: unknown
  ) {
    return {
      create: createMock,
      listForUser: listForUserMock,
      getById: getByIdMock,
      update: updateMock,
      delete: deleteMock,
      rotateCredentials: rotateCredentialsMock,
      enable: enableMock,
      disable: disableMock,
    };
  }),
}));

const { AutomationConnectionController } = await import(
  "./automation-connection.controller.js"
);

const SAMPLE_CONNECTION = {
  id: "conn-1",
  userId: "user-1",
  provider: "fake",
  label: "My Connection",
  status: "PENDING",
  metadata: null,
  encryptedCredentials: "cipher",
  credentialsIv: "iv",
  lastVerifiedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function resetAll() {
  for (const mock of [
    createMock,
    listForUserMock,
    getByIdMock,
    updateMock,
    deleteMock,
    rotateCredentialsMock,
    enableMock,
    disableMock,
  ]) {
    mock.mockReset();
  }
}

describe("AutomationConnectionController", () => {
  beforeEach(() => {
    resetAll();
  });

  it("createConnection() passes the caller's id and body through to the service", async () => {
    createMock.mockResolvedValue(SAMPLE_CONNECTION);
    const req = {
      user: { id: "user-1" },
      body: { provider: "fake", label: "My Connection", credentials: { apiKey: "x" } },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.createConnection(req, res);

    expect(createMock).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "fake",
      label: "My Connection",
      credentials: { apiKey: "x" },
      metadata: null,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("createConnection() response never includes encryptedCredentials/credentialsIv", async () => {
    createMock.mockResolvedValue(SAMPLE_CONNECTION);
    const req = {
      user: { id: "user-1" },
      body: { provider: "fake", label: "My Connection", credentials: { apiKey: "x" } },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.createConnection(req, res);

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonArg.data).not.toHaveProperty("encryptedCredentials");
    expect(jsonArg.data).not.toHaveProperty("credentialsIv");
  });

  it("getConnections() lists connections scoped to the caller", async () => {
    listForUserMock.mockResolvedValue([SAMPLE_CONNECTION]);
    const req = { user: { id: "user-1" } } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.getConnections(req, res);

    expect(listForUserMock).toHaveBeenCalledWith("user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getConnection() propagates a NotFoundError from the service", async () => {
    getByIdMock.mockRejectedValue(new Error("Connection not found."));
    const req = {
      user: { id: "user-1" },
      params: { id: "missing" },
    } as unknown as Request;
    const res = createResponse();

    await expect(
      AutomationConnectionController.getConnection(req, res)
    ).rejects.toThrow("Connection not found.");
  });

  it("updateConnection() forwards label/metadata to the service", async () => {
    updateMock.mockResolvedValue(SAMPLE_CONNECTION);
    const req = {
      user: { id: "user-1" },
      params: { id: "conn-1" },
      body: { label: "Renamed" },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.updateConnection(req, res);

    expect(updateMock).toHaveBeenCalledWith("conn-1", "user-1", {
      label: "Renamed",
      metadata: undefined,
    });
  });

  it("deleteConnection() responds 200 with no data", async () => {
    deleteMock.mockResolvedValue(undefined);
    const req = {
      user: { id: "user-1" },
      params: { id: "conn-1" },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.deleteConnection(req, res);

    expect(deleteMock).toHaveBeenCalledWith("conn-1", "user-1");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });

  it("rotateCredentials() forwards the new credentials to the service", async () => {
    rotateCredentialsMock.mockResolvedValue(SAMPLE_CONNECTION);
    const req = {
      user: { id: "user-1" },
      params: { id: "conn-1" },
      body: { credentials: { apiKey: "new" } },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.rotateCredentials(req, res);

    expect(rotateCredentialsMock).toHaveBeenCalledWith("conn-1", "user-1", {
      apiKey: "new",
    });
  });

  it("enableConnection() calls the service's enable()", async () => {
    enableMock.mockResolvedValue({ ...SAMPLE_CONNECTION, status: "ACTIVE" });
    const req = {
      user: { id: "user-1" },
      params: { id: "conn-1" },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.enableConnection(req, res);

    expect(enableMock).toHaveBeenCalledWith("conn-1", "user-1");
  });

  it("disableConnection() calls the service's disable()", async () => {
    disableMock.mockResolvedValue({ ...SAMPLE_CONNECTION, status: "REVOKED" });
    const req = {
      user: { id: "user-1" },
      params: { id: "conn-1" },
    } as unknown as Request;
    const res = createResponse();

    await AutomationConnectionController.disableConnection(req, res);

    expect(disableMock).toHaveBeenCalledWith("conn-1", "user-1");
  });
});
