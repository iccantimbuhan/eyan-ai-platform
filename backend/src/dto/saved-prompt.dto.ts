import type { ContentType } from "../generated/prisma/enums.js";

export interface SavedPromptResponseDto {
  id: string;
  userId: string;
  projectId: string | null;
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
  // Omitted/undefined -> a global, reusable prompt (unchanged existing
  // behavior). Set -> a project-scoped PROMPT_TEMPLATE asset, visible in
  // that project's Asset Library. See docs/ASSET_LIBRARY.md.
  projectId?: string;
}

export interface UpdateSavedPromptDto {
  name?: string;
  promptBody?: string;
  contentType?: ContentType;
}
