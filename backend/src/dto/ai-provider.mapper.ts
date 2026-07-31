import type { AiProvider, AiProviderCredential } from "../generated/prisma/client.js";
import type { AiProviderCredentialResponseDto, AiProviderResponseDto } from "./ai-provider.dto.js";

export function mapAiProviderToResponse(row: AiProvider): AiProviderResponseDto {
  return {
    id: row.id,
    key: row.key,
    displayName: row.displayName,
    kind: row.kind,
    baseUrl: row.baseUrl,
    isEnabled: row.isEnabled,
    rateLimitPerMinute: row.rateLimitPerMinute,
    healthStatus: row.healthStatus,
    lastHealthCheckAt: row.lastHealthCheckAt,
    lastHealthMessage: row.lastHealthMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Deliberately never includes encryptedCredentials/credentialsIv — same
// posture as every AutomationConnection response in this codebase.
export function mapAiProviderCredentialToResponse(row: AiProviderCredential): AiProviderCredentialResponseDto {
  return {
    id: row.id,
    providerId: row.providerId,
    label: row.label,
    status: row.status,
    lastVerifiedAt: row.lastVerifiedAt,
    createdAt: row.createdAt,
  };
}
