-- AlterEnum
ALTER TYPE "VideoAssetKind" ADD VALUE 'UPLOADED_SOURCE';

-- AlterTable
ALTER TABLE "VideoAsset" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "sourceFileName" TEXT,
ADD COLUMN     "videoFormat" TEXT;
