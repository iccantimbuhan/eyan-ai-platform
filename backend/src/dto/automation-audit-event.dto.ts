import type { AutomationAuditAction } from "../generated/prisma/enums.js";

export interface AutomationAuditEventResponseDto {
  id: string;
  actorId: string;
  action: AutomationAuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
