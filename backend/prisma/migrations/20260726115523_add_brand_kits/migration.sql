-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'BRAND_KIT';

-- AlterTable
ALTER TABLE "GeneratedContent" ADD COLUMN     "brandKitId" TEXT;

-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN     "brandKitId" TEXT;

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "logos" JSONB,
    "primaryColors" JSONB,
    "secondaryColors" JSONB,
    "fonts" JSONB,
    "typography" TEXT,
    "toneOfVoice" TEXT,
    "writingStyle" TEXT,
    "audience" TEXT,
    "ctaStyle" TEXT,
    "approvedTerminology" TEXT[],
    "restrictedWords" TEXT[],
    "brandGuidelines" TEXT,
    "imageStyle" TEXT,
    "socialMediaGuidelines" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandKit_projectId_idx" ON "BrandKit"("projectId");

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
