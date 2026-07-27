import { describe, expect, it, vi } from "vitest";

import { AutomationConnectionService } from "./automation-connection.service.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "conn-1", provider: "fake" }),
    update: vi.fn().mockResolvedValue({ id: "conn-1" }),
    delete: vi.fn().mockResolvedValue({ id: "conn-1" }),
    findById: vi
      .fn()
      .mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        provider: "fake",
        encryptedCredentials: "cipher",
        credentialsIv: "iv",
      }),
    findByIdForSystem: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue([]),
    findByProvider: vi.fn().mockResolvedValue([]),
    findActiveConnections: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({ id: "conn-1", status: "ACTIVE" }),
    ...overrides,
  };
}

function createCredentialManager(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    encrypt: vi
      .fn()
      .mockReturnValue({ encryptedCredentials: "cipher", credentialsIv: "iv" }),
    decrypt: vi.fn().mockReturnValue({ apiKey: "secret" }),
    rotate: vi
      .fn()
      .mockReturnValue({ encryptedCredentials: "new-cipher", credentialsIv: "new-iv" }),
    ...overrides,
  };
}

function createAuditService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    record: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createService(
  repoOverrides: Partial<Record<string, unknown>> = {},
  credentialOverrides: Partial<Record<string, unknown>> = {},
  auditOverrides: Partial<Record<string, unknown>> = {}
) {
  const repository = createRepository(repoOverrides);
  const credentialManager = createCredentialManager(credentialOverrides);
  const auditService = createAuditService(auditOverrides);
  const service = new AutomationConnectionService(
    repository as never,
    credentialManager as never,
    auditService as never
  );

  return { service, repository, credentialManager, auditService };
}

describe("AutomationConnectionService", () => {
  it("create() encrypts credentials via CredentialManager, never itself", async () => {
    const { service, repository, credentialManager, auditService } =
      createService();

    await service.create({
      userId: "user-1",
      provider: "fake",
      label: "My Connection",
      credentials: { apiKey: "secret" },
    });

    expect(credentialManager.encrypt).toHaveBeenCalledWith({
      apiKey: "secret",
    });
    expect(repository.create).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "fake",
      label: "My Connection",
      encryptedCredentials: "cipher",
      credentialsIv: "iv",
      status: "PENDING",
      metadata: null,
    });
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: "user-1",
      action: "CONNECTION_CREATED",
      targetType: "AutomationConnection",
      targetId: "conn-1",
      metadata: { provider: "fake" },
    });
  });

  it("update() verifies ownership before writing", async () => {
    const { service, repository } = createService({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(
      service.update("conn-1", "user-2", { label: "New" })
    ).rejects.toThrow("Connection not found.");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rotateCredentials() re-encrypts and marks the connection ACTIVE", async () => {
    const { service, repository, credentialManager, auditService } =
      createService();

    await service.rotateCredentials("conn-1", "user-1", { apiKey: "new" });

    expect(credentialManager.rotate).toHaveBeenCalledWith({ apiKey: "new" });
    expect(repository.update).toHaveBeenCalledWith(
      "conn-1",
      expect.objectContaining({
        encryptedCredentials: "new-cipher",
        credentialsIv: "new-iv",
        status: "ACTIVE",
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREDENTIAL_ACCESSED",
        metadata: expect.objectContaining({ operation: "rotate" }),
      })
    );
  });

  it("reveal() decrypts via CredentialManager and audits CREDENTIAL_ACCESSED", async () => {
    const { service, credentialManager, auditService } = createService();

    const result = await service.reveal("conn-1", "user-1");

    expect(credentialManager.decrypt).toHaveBeenCalledWith("cipher", "iv");
    expect(result).toEqual({ apiKey: "secret" });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREDENTIAL_ACCESSED" })
    );
  });

  it("reveal() throws for a connection the caller does not own", async () => {
    const { service, credentialManager } = createService({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(service.reveal("conn-1", "user-2")).rejects.toThrow(
      "Connection not found."
    );
    expect(credentialManager.decrypt).not.toHaveBeenCalled();
  });

  it("delete() removes the row and audits CONNECTION_REVOKED", async () => {
    const { service, repository, auditService } = createService();

    await service.delete("conn-1", "user-1");

    expect(repository.delete).toHaveBeenCalledWith("conn-1");
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONNECTION_REVOKED" })
    );
  });

  it("enable() promotes status to ACTIVE and audits CONNECTION_TESTED", async () => {
    const { service, repository, auditService } = createService();

    await service.enable("conn-1", "user-1");

    expect(repository.updateStatus).toHaveBeenCalledWith(
      "conn-1",
      "ACTIVE",
      expect.any(Date)
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONNECTION_TESTED" })
    );
  });

  it("disable() sets status to REVOKED and audits CONNECTION_REVOKED", async () => {
    const { service, repository, auditService } = createService();

    await service.disable("conn-1", "user-1");

    expect(repository.updateStatus).toHaveBeenCalledWith("conn-1", "REVOKED");
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONNECTION_REVOKED" })
    );
  });

  it("listForUser() delegates to the repository", async () => {
    const { service, repository } = createService();

    await service.listForUser("user-1");

    expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("listActiveForUser() delegates to the repository", async () => {
    const { service, repository } = createService();

    await service.listActiveForUser("user-1");

    expect(repository.findActiveConnections).toHaveBeenCalledWith("user-1");
  });
});
