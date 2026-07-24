import type {
  GenerationStatus,
  ImageFormat,
} from "../generated/prisma/enums.js";

export interface ImageResponseDto {
  id: string;
  projectId: string;
  prompt: string;
  negativePrompt: string | null;
  provider: string;
  model: string;
  width: number;
  height: number;
  format: ImageFormat;
  storagePath: string | null;
  thumbnailPath: string | null;
  status: GenerationStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListImagesQueryDto {
  projectId: string;
  page?: number;
  pageSize?: number;
}
