-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('BLOG', 'EMAIL', 'SOCIAL_MEDIA', 'MARKETING_COPY', 'DOCUMENTATION', 'IMAGE', 'PROMPT_TEMPLATE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "GeneratedContent" ADD COLUMN     "generationTimeMs" INTEGER;

-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN     "generationTimeMs" INTEGER;

-- AlterTable
ALTER TABLE "SavedPrompt" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "AssetReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "qaScore" INTEGER,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "lineageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetReview_projectId_idx" ON "AssetReview"("projectId");

-- CreateIndex
CREATE INDEX "AssetReview_status_idx" ON "AssetReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetReview_assetType_sourceId_key" ON "AssetReview"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "AssetVersion_projectId_idx" ON "AssetVersion"("projectId");

-- CreateIndex
CREATE INDEX "AssetVersion_lineageId_idx" ON "AssetVersion"("lineageId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_assetType_sourceId_key" ON "AssetVersion"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "SavedPrompt_projectId_idx" ON "SavedPrompt"("projectId");

-- AddForeignKey
ALTER TABLE "SavedPrompt" ADD CONSTRAINT "SavedPrompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReview" ADD CONSTRAINT "AssetReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReview" ADD CONSTRAINT "AssetReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "AssetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
