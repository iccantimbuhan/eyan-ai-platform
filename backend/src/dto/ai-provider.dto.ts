import type { AiProviderKind, McpHealthStatus } from "../generated/prisma/enums.js";

export interface AiProviderResponseDto {
  id: string;
  key: string;
  displayName: string;
  kind: AiProviderKind;
  baseUrl: string | null;
  isEnabled: boolean;
  rateLimitPerMinute: number | null;
  healthStatus: McpHealthStatus;
  lastHealthCheckAt: Date | null;
  lastHealthMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiProviderCredentialResponseDto {
  id: string;
  providerId: string;
  label: string;
  status: string;
  lastVerifiedAt: Date | null;
  createdAt: Date;
}
