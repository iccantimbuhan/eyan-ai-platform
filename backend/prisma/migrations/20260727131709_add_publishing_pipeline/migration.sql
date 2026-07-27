-- CreateEnum
CREATE TYPE "PublishingStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReviewEventType" ADD VALUE 'PUBLISH_SCHEDULED';
ALTER TYPE "ReviewEventType" ADD VALUE 'PUBLISH_STARTED';
ALTER TYPE "ReviewEventType" ADD VALUE 'PUBLISHED';
ALTER TYPE "ReviewEventType" ADD VALUE 'PUBLISH_FAILED';

-- CreateTable
CREATE TABLE "PublishingRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "PublishingStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "externalUrl" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublishingRecord_projectId_idx" ON "PublishingRecord"("projectId");

-- CreateIndex
CREATE INDEX "PublishingRecord_assetType_sourceId_idx" ON "PublishingRecord"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "PublishingRecord_status_idx" ON "PublishingRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublishingRecord_assetType_sourceId_platform_key" ON "PublishingRecord"("assetType", "sourceId", "platform");

-- AddForeignKey
ALTER TABLE "PublishingRecord" ADD CONSTRAINT "PublishingRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingRecord" ADD CONSTRAINT "PublishingRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
