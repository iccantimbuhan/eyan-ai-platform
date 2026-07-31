import type { AiCapability } from "../generated/prisma/client.js";
import type { AiCapabilityResponseDto } from "./ai-capability.dto.js";

export function mapAiCapabilityToResponse(row: AiCapability): AiCapabilityResponseDto {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    brainId: row.brainId,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
