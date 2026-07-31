import {
  aiProviderRepository,
  AiProviderRepository,
  type CreateAiProviderData,
  type UpdateAiProviderData,
} from "../repositories/ai-provider.repository.js";
import {
  aiProviderCredentialRepository,
  AiProviderCredentialRepository,
} from "../repositories/ai-provider-credential.repository.js";
import { credentialManagerService, CredentialManagerService } from "./credential-manager.service.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiProvider, AiProviderCredential } from "../generated/prisma/client.js";

export interface AddAiProviderCredentialInput {
  providerId: string;
  label: string;
  credentials: Record<string, unknown>;
}

// Thin CRUD orchestrator for AiProvider, plus credential lifecycle —
// encryption/decryption is entirely CredentialManagerService's job (no new
// cryptography, TDD §9), this service only decides when to call it and
// always audits PROVIDER_CREDENTIAL_ACCESSED on every reveal, matching
// AutomationConnectionService's own threat-model reasoning.
export class AiProviderService {
  constructor(
    private readonly repository: AiProviderRepository = aiProviderRepository,
    private readonly credentialRepository: AiProviderCredentialRepository = aiProviderCredentialRepository,
    private readonly credentialManager: CredentialManagerService = credentialManagerService,
    private readonly auditService: AiAuditService = aiAuditService
  ) {}

  async create(data: CreateAiProviderData, actorId: string): Promise<AiProvider> {
    const provider = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "PROVIDER_CREATED",
      targetType: "AiProvider",
      targetId: provider.id,
      metadata: { key: provider.key, kind: provider.kind },
    });

    return provider;
  }

  async update(id: string, data: UpdateAiProviderData, actorId: string): Promise<AiProvider> {
    await this.getOrThrow(id);
    const updated = await this.repository.update(id, data);

    await this.auditService.record({
      actorId,
      action: "PROVIDER_UPDATED",
      targetType: "AiProvider",
      targetId: id,
    });

    return updated;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const provider = await this.getOrThrow(id);
    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "PROVIDER_UPDATED",
      targetType: "AiProvider",
      targetId: id,
      metadata: { deleted: true, key: provider.key },
    });
  }

  async getById(id: string): Promise<AiProvider> {
    return this.getOrThrow(id);
  }

  async list(): Promise<AiProvider[]> {
    return this.repository.findAll();
  }

  async addCredential(input: AddAiProviderCredentialInput, actorId: string): Promise<AiProviderCredential> {
    await this.getOrThrow(input.providerId);

    const { encryptedCredentials, credentialsIv } = this.credentialManager.encrypt(input.credentials);
    const credential = await this.credentialRepository.create({
      providerId: input.providerId,
      label: input.label,
      encryptedCredentials,
      credentialsIv,
    });

    await this.auditService.record({
      actorId,
      action: "PROVIDER_CREDENTIAL_ADDED",
      targetType: "AiProviderCredential",
      targetId: credential.id,
      metadata: { providerId: input.providerId, label: input.label },
    });

    return credential;
  }

  async rotateCredential(credentialId: string, credentials: Record<string, unknown>, actorId: string): Promise<AiProviderCredential> {
    const { encryptedCredentials, credentialsIv } = this.credentialManager.rotate(credentials);
    const rotated = await this.credentialRepository.rotate(credentialId, encryptedCredentials, credentialsIv);

    await this.auditService.record({
      actorId,
      action: "PROVIDER_CREDENTIAL_ROTATED",
      targetType: "AiProviderCredential",
      targetId: credentialId,
    });

    return rotated;
  }

  // Resolves and decrypts a provider's credential for AiRoutingService to
  // pass into a provider plugin's chat() call — every call is audited as a
  // machine-initiated PROVIDER_CREDENTIAL_ACCESSED event, same threat model
  // as McpHealthService.buildConnectorConfig()'s own reveal.
  async resolveCredentials(providerId: string, actorId: string | null): Promise<Record<string, unknown> | null> {
    const credentials = await this.credentialRepository.findByProvider(providerId);
    const active = credentials[0];
    if (!active) return null;

    const decrypted = this.credentialManager.decrypt(active.encryptedCredentials, active.credentialsIv);

    await this.auditService.record({
      actorId,
      action: "PROVIDER_CREDENTIAL_ACCESSED",
      targetType: "AiProviderCredential",
      targetId: active.id,
    });

    return decrypted;
  }

  private async getOrThrow(id: string): Promise<AiProvider> {
    const provider = await this.repository.findById(id);
    if (!provider) {
      throw new NotFoundError("AI Core provider not found.");
    }
    return provider;
  }
}

export const aiProviderService = new AiProviderService();
