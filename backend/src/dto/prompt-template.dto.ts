import type { ContentType } from "../generated/prisma/enums.js";

export interface PromptTemplateResponseDto {
  id: string;
  name: string;
  category: string;
  contentType: ContentType;
  promptBody: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListPromptTemplatesQueryDto {
  category?: string;
  contentType?: ContentType;
}
