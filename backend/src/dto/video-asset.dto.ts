import type {
  GenerationStatus,
  ImageFormat as PrismaImageFormat,
  VideoAssetKind,
} from "../generated/prisma/enums.js";
import type { ImageFormat } from "../providers/interfaces/image-provider.js";

export interface VideoAssetResponseDto {
  id: string;
  projectId: string;
  brandKitId: string | null;
  videoGroupId: string;
  kind: VideoAssetKind;
  prompt: string;
  output: string | null;
  provider: string | null;
  width: number | null;
  height: number | null;
  format: PrismaImageFormat | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  model: string | null;
  status: GenerationStatus;
  errorMessage: string | null;
  generationTimeMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListVideoAssetsQueryDto {
  projectId: string;
  videoGroupId?: string;
  kind?: VideoAssetKind;
  page?: number;
  pageSize?: number;
}

export interface GenerateVideoAssetDto {
  projectId: string;
  kind: VideoAssetKind;
  prompt: string;
  // Omitted -> a new video (fresh videoGroupId). Set -> attaches this
  // artifact to an existing video's group. See VideoAssetService.generate().
  videoGroupId?: string;
  // Omitted -> unchanged behavior. Set -> folded into the prompt, guidance
  // only, never enforced. See docs/ASSET_LIBRARY.md.
  brandKitId?: string;
  // Image-kind-only (STORYBOARD/THUMBNAIL); ignored for text kinds, same
  // posture as ImageService ignoring negativePrompt for Gemini.
  provider?: string;
  width?: number;
  height?: number;
  format?: ImageFormat;
}
