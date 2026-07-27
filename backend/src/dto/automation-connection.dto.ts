import type { ConnectionStatus } from "../generated/prisma/enums.js";

// Deliberately has no encryptedCredentials/credentialsIv field — see
// automation-connection.mapper.ts, the one place that guarantees a raw
// credential can never leave the process via an API response.
export interface AutomationConnectionResponseDto {
  id: string;
  userId: string;
  provider: string;
  label: string;
  status: ConnectionStatus;
  metadata: Record<string, unknown> | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAutomationConnectionDto {
  provider: string;
  label: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateAutomationConnectionDto {
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface RotateAutomationConnectionCredentialsDto {
  credentials: Record<string, unknown>;
}
