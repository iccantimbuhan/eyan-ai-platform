import type { AiMemoryStrategy } from "../generated/prisma/enums.js";

export interface AiBrainResponseDto {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  memoryStrategy: AiMemoryStrategy;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
