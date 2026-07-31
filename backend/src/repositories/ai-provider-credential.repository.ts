import { prisma } from "../lib/prisma.js";
import type { ConnectionStatus } from "../generated/prisma/enums.js";

export interface CreateAiProviderCredentialData {
  providerId: string;
  label: string;
  encryptedCredentials: string;
  credentialsIv: string;
  status?: ConnectionStatus;
}

// Identical shape to AutomationConnection's own persistence layer —
// encryption/decryption itself is CredentialManagerService's job, never
// this repository's.
export class AiProviderCredentialRepository {
  async create(data: CreateAiProviderCredentialData) {
    return prisma.aiProviderCredential.create({ data });
  }

  async delete(id: string) {
    return prisma.aiProviderCredential.delete({ where: { id } });
  }

  async findById(id: string) {
    return prisma.aiProviderCredential.findUnique({ where: { id } });
  }

  async findByProvider(providerId: string) {
    return prisma.aiProviderCredential.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async rotate(id: string, encryptedCredentials: string, credentialsIv: string) {
    return prisma.aiProviderCredential.update({
      where: { id },
      data: { encryptedCredentials, credentialsIv, lastVerifiedAt: null },
    });
  }

  async markVerified(id: string, status: ConnectionStatus) {
    return prisma.aiProviderCredential.update({
      where: { id },
      data: { status, lastVerifiedAt: new Date() },
    });
  }
}

export const aiProviderCredentialRepository = new AiProviderCredentialRepository();
