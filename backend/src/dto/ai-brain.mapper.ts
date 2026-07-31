import type { AiBrain } from "../generated/prisma/client.js";
import type { AiBrainResponseDto } from "./ai-brain.dto.js";

export function mapAiBrainToResponse(row: AiBrain): AiBrainResponseDto {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    memoryStrategy: row.memoryStrategy,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
