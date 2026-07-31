import type { AiAuditAction } from "../generated/prisma/enums.js";

export interface AiAuditEventResponseDto {
  id: string;
  actorId: string | null;
  action: AiAuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
