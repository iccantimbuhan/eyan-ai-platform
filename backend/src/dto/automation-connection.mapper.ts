import type { AutomationConnection } from "../generated/prisma/client.js";
import type { AutomationConnectionResponseDto } from "./automation-connection.dto.js";

// Deliberately omits row.encryptedCredentials/row.credentialsIv — this
// mapper is the one place that guarantees a raw credential value can never
// leave the process via an API response, regardless of what a controller
// does with the row it gets back from the service.
export function mapAutomationConnectionToResponse(
  row: AutomationConnection
): AutomationConnectionResponseDto {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    label: row.label,
    status: row.status,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    lastVerifiedAt: row.lastVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
