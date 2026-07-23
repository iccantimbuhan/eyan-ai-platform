import type { ContentType } from "../generated/prisma/enums.js";

export interface SavedPromptResponseDto {
  id: string;
  userId: string;
  name: string;
  promptBody: string;
  contentType: ContentType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavedPromptDto {
  name: string;
  promptBody: string;
  contentType: ContentType;
}

export interface UpdateSavedPromptDto {
  name?: string;
  promptBody?: string;
  contentType?: ContentType;
}
