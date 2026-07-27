import type { VideoAsset } from "../generated/prisma/client.js";
import type { VideoAssetResponseDto } from "./video-asset.dto.js";

export function mapVideoAssetToResponse(row: VideoAsset): VideoAssetResponseDto {
  return {
    id: row.id,
    projectId: row.projectId,
    brandKitId: row.brandKitId,
    videoGroupId: row.videoGroupId,
    kind: row.kind,
    prompt: row.prompt,
    output: row.output,
    provider: row.provider,
    width: row.width,
    height: row.height,
    format: row.format,
    storagePath: row.storagePath,
    thumbnailPath: row.thumbnailPath,
    model: row.model,
    status: row.status,
    errorMessage: row.errorMessage,
    generationTimeMs: row.generationTimeMs,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
