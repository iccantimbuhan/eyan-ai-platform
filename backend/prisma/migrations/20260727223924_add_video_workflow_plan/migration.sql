-- CreateTable
CREATE TABLE "VideoWorkflowPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "workflow" JSONB NOT NULL,
    "model" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoWorkflowPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoWorkflowPlan_projectId_idx" ON "VideoWorkflowPlan"("projectId");

-- CreateIndex
CREATE INDEX "VideoWorkflowPlan_videoAssetId_idx" ON "VideoWorkflowPlan"("videoAssetId");

-- AddForeignKey
ALTER TABLE "VideoWorkflowPlan" ADD CONSTRAINT "VideoWorkflowPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWorkflowPlan" ADD CONSTRAINT "VideoWorkflowPlan_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
