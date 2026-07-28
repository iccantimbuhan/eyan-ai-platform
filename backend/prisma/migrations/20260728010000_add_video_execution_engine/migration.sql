-- AlterEnum
ALTER TYPE "VideoAssetKind" ADD VALUE 'EDITED_VIDEO';

-- AlterTable
ALTER TABLE "VideoWorkflowPlan" ADD COLUMN     "executedAt" TIMESTAMP(3),
ADD COLUMN     "resultVideoAssetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VideoWorkflowPlan_resultVideoAssetId_key" ON "VideoWorkflowPlan"("resultVideoAssetId");

-- AddForeignKey
ALTER TABLE "VideoWorkflowPlan" ADD CONSTRAINT "VideoWorkflowPlan_resultVideoAssetId_fkey" FOREIGN KEY ("resultVideoAssetId") REFERENCES "VideoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

