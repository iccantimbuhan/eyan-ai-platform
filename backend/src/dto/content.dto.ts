import type { ContentType } from "../generated/prisma/enums.js";

export interface GenerateContentDto {
  projectId: string;
  type: ContentType;
  prompt: string;
  // Omitted -> unchanged existing behavior. Set -> ContentService folds the
  // kit's tone/terminology/restricted-words guidance into the system
  // prompt. See docs/ASSET_LIBRARY.md.
  brandKitId?: string;
}

export interface ContentResponseDto {
  id: string;
  projectId: string;
  type: ContentType;
  prompt: string;
  output: string;
  model: string;
  createdBy: string | null;
  generationTimeMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListContentQueryDto {
  projectId: string;
  page?: number;
  pageSize?: number;
}
