import type {
  GenerationStatus,
  ImageFormat as PrismaImageFormat,
} from "../generated/prisma/enums.js";
import type { ImageFormat } from "../providers/interfaces/image-provider.js";

export interface ImageResponseDto {
  id: string;
  projectId: string;
  prompt: string;
  negativePrompt: string | null;
  provider: string;
  model: string | null;
  width: number;
  height: number;
  format: PrismaImageFormat;
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

export interface GenerateImageDto {
  projectId: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  format?: ImageFormat;
  provider?: string;
}
