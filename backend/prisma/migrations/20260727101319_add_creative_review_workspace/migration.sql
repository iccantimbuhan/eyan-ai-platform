-- CreateEnum
CREATE TYPE "ReviewEventType" AS ENUM ('STATUS_CHANGED', 'COMMENT_ADDED', 'COMMENT_RESOLVED', 'ANNOTATION_ADDED', 'ASSIGNED', 'UNASSIGNED', 'VERSION_CREATED');

-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'REVISION_REQUESTED';

-- CreateTable
CREATE TABLE "AssetComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "regionX" DOUBLE PRECISION,
    "regionY" DOUBLE PRECISION,
    "regionWidth" DOUBLE PRECISION,
    "regionHeight" DOUBLE PRECISION,
    "timestampMs" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReviewAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReviewEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "type" "ReviewEventType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "ReviewStatus",
    "toStatus" "ReviewStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetComment_projectId_idx" ON "AssetComment"("projectId");

-- CreateIndex
CREATE INDEX "AssetComment_assetType_sourceId_idx" ON "AssetComment"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "AssetReviewAssignment_projectId_idx" ON "AssetReviewAssignment"("projectId");

-- CreateIndex
CREATE INDEX "AssetReviewAssignment_assigneeId_idx" ON "AssetReviewAssignment"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetReviewAssignment_assetType_sourceId_key" ON "AssetReviewAssignment"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "AssetReviewEvent_projectId_idx" ON "AssetReviewEvent"("projectId");

-- CreateIndex
CREATE INDEX "AssetReviewEvent_assetType_sourceId_idx" ON "AssetReviewEvent"("assetType", "sourceId");

-- CreateIndex
CREATE INDEX "AssetReviewEvent_createdAt_idx" ON "AssetReviewEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AssetComment" ADD CONSTRAINT "AssetComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetComment" ADD CONSTRAINT "AssetComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewAssignment" ADD CONSTRAINT "AssetReviewAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewAssignment" ADD CONSTRAINT "AssetReviewAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewAssignment" ADD CONSTRAINT "AssetReviewAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewEvent" ADD CONSTRAINT "AssetReviewEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReviewEvent" ADD CONSTRAINT "AssetReviewEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
