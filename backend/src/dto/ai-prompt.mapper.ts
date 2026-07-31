import type { AiPrompt } from "../generated/prisma/client.js";
import type { AiPromptResponseDto } from "./ai-prompt.dto.js";

export function mapAiPromptToResponse(row: AiPrompt): AiPromptResponseDto {
  return {
    id: row.id,
    brainId: row.brainId,
    version: row.version,
    body: row.body,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}
