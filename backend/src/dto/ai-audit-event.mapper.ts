import type { AiAuditEvent } from "../generated/prisma/client.js";
import type { AiAuditEventResponseDto } from "./ai-audit-event.dto.js";

export function mapAiAuditEventToResponse(row: AiAuditEvent): AiAuditEventResponseDto {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  };
}
