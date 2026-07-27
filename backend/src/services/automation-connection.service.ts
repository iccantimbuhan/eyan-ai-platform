import {
  automationConnectionRepository,
  AutomationConnectionRepository,
} from "../repositories/automation-connection.repository.js";
import {
  credentialManagerService,
  CredentialManagerService,
} from "./credential-manager.service.js";
import {
  automationAuditService,
  AutomationAuditService,
} from "./automation-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AutomationConnection } from "../generated/prisma/client.js";

export interface CreateConnectionInput {
  userId: string;
  provider: string;
  label: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateConnectionInput {
  label?: string;
  metadata?: Record<string, unknown> | null;
}

// ConnectionManager: owns the AutomationConnection resource's lifecycle
// (create/update/delete/enable/disable) and audit trail. It never touches
// crypto directly — encryption/decryption is delegated entirely to
// CredentialManagerService, and every ownership check happens here (via
// AutomationConnectionRepository's userId-scoped queries) before any
// credential is ever encrypted, decrypted, or rotated.
export class AutomationConnectionService {
  constructor(
    private readonly repository: AutomationConnectionRepository = automationConnectionRepository,
    private readonly credentialManager: CredentialManagerService = credentialManagerService,
    private readonly auditService: AutomationAuditService = automationAuditService
  ) {}

  async create(input: CreateConnectionInput): Promise<AutomationConnection> {
    const { encryptedCredentials, credentialsIv } =
      this.credentialManager.encrypt(input.credentials);

    const connection = await this.repository.create({
      userId: input.userId,
      provider: input.provider,
      label: input.label,
      encryptedCredentials,
      credentialsIv,
      status: "PENDING",
      metadata: input.metadata ?? null,
    });

    await this.auditService.record({
      actorId: input.userId,
      action: "CONNECTION_CREATED",
      targetType: "AutomationConnection",
      targetId: connection.id,
      metadata: { provider: input.provider },
    });

    return connection;
  }

  async update(
    id: string,
    userId: string,
    data: UpdateConnectionInput
  ): Promise<AutomationConnection> {
    await this.getOwned(id, userId);

    return this.repository.update(id, data);
  }

  // Rotation never has to decrypt the old credentials — it just encrypts
  // the new payload and replaces the stored ciphertext/iv, the same
  // AutomationConnectionRepository.update() call an update() to label/
  // metadata already uses. Marks the connection ACTIVE + freshly verified,
  // since supplying a working replacement credential is itself evidence
  // it's usable.
  async rotateCredentials(
    id: string,
    userId: string,
    credentials: Record<string, unknown>
  ): Promise<AutomationConnection> {
    const existing = await this.getOwned(id, userId);
    const { encryptedCredentials, credentialsIv } =
      this.credentialManager.rotate(credentials);

    const updated = await this.repository.update(id, {
      encryptedCredentials,
      credentialsIv,
      status: "ACTIVE",
      lastVerifiedAt: new Date(),
    });

    await this.auditService.record({
      actorId: userId,
      action: "CREDENTIAL_ACCESSED",
      targetType: "AutomationConnection",
      targetId: id,
      metadata: { provider: existing.provider, operation: "rotate" },
    });

    return updated;
  }

  // The only path that ever returns plaintext credentials. Every call is
  // audited as CREDENTIAL_ACCESSED regardless of who calls it or why — see
  // Section 13 of the approved architecture: the audit trail covers
  // machine access, not just direct user action.
  async reveal(id: string, userId: string): Promise<Record<string, unknown>> {
    const connection = await this.getOwned(id, userId);
    const credentials = this.credentialManager.decrypt(
      connection.encryptedCredentials,
      connection.credentialsIv
    );

    await this.auditService.record({
      actorId: userId,
      action: "CREDENTIAL_ACCESSED",
      targetType: "AutomationConnection",
      targetId: id,
      metadata: { provider: connection.provider },
    });

    return credentials;
  }

  async delete(id: string, userId: string): Promise<void> {
    const connection = await this.getOwned(id, userId);

    await this.repository.delete(id);

    await this.auditService.record({
      actorId: userId,
      action: "CONNECTION_REVOKED",
      targetType: "AutomationConnection",
      targetId: id,
      metadata: { provider: connection.provider, reason: "deleted" },
    });
  }

  // Enable: promotes a connection to ACTIVE. Logged as CONNECTION_TESTED —
  // going ACTIVE is the outcome of a verified-working credential (the same
  // action a future POST /connections/:id/test endpoint would record), not
  // a distinct concept the audit action enum needs its own value for.
  async enable(id: string, userId: string): Promise<AutomationConnection> {
    await this.getOwned(id, userId);

    const updated = await this.repository.updateStatus(
      id,
      "ACTIVE",
      new Date()
    );

    await this.auditService.record({
      actorId: userId,
      action: "CONNECTION_TESTED",
      targetType: "AutomationConnection",
      targetId: id,
      metadata: { status: "ACTIVE" },
    });

    return updated;
  }

  // Disable: revokes access without deleting the row (unlike delete()), so
  // the connection can be re-enabled later without re-entering credentials.
  async disable(id: string, userId: string): Promise<AutomationConnection> {
    await this.getOwned(id, userId);

    const updated = await this.repository.updateStatus(id, "REVOKED");

    await this.auditService.record({
      actorId: userId,
      action: "CONNECTION_REVOKED",
      targetType: "AutomationConnection",
      targetId: id,
      metadata: { status: "REVOKED" },
    });

    return updated;
  }

  // Exposes the same ownership-checked lookup update()/delete()/rotate()/
  // reveal() already use privately, for the GET /connections/:id detail
  // endpoint (Milestone 5) — no behavior change to any existing method.
  async getById(id: string, userId: string): Promise<AutomationConnection> {
    return this.getOwned(id, userId);
  }

  async listForUser(userId: string): Promise<AutomationConnection[]> {
    return this.repository.findByUserId(userId);
  }

  async listActiveForUser(userId: string): Promise<AutomationConnection[]> {
    return this.repository.findActiveConnections(userId);
  }

  private async getOwned(
    id: string,
    userId: string
  ): Promise<AutomationConnection> {
    const connection = await this.repository.findById(id, userId);

    if (!connection) {
      throw new NotFoundError("Connection not found.");
    }

    return connection;
  }
}

export const automationConnectionService = new AutomationConnectionService();
