import type { AutomationAuditEvent } from "../generated/prisma/client.js";
import type { AutomationAuditEventResponseDto } from "./automation-audit-event.dto.js";

export function mapAutomationAuditEventToResponse(
  row: AutomationAuditEvent
): AutomationAuditEventResponseDto {
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
