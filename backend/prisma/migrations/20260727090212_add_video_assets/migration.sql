-- CreateEnum
CREATE TYPE "VideoAssetKind" AS ENUM ('SCRIPT', 'SCENE_BREAKDOWN', 'SHOT_LIST', 'VOICE_OVER_SCRIPT', 'CAPTIONS', 'SUBTITLES', 'STORYBOARD', 'THUMBNAIL');

-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'VIDEO';

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "brandKitId" TEXT,
    "videoGroupId" TEXT NOT NULL,
    "kind" "VideoAssetKind" NOT NULL,
    "prompt" TEXT NOT NULL,
    "output" TEXT,
    "provider" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "format" "ImageFormat",
    "storagePath" TEXT,
    "thumbnailPath" TEXT,
    "model" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "generationTimeMs" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAsset_projectId_idx" ON "VideoAsset"("projectId");

-- CreateIndex
CREATE INDEX "VideoAsset_videoGroupId_idx" ON "VideoAsset"("videoGroupId");

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
