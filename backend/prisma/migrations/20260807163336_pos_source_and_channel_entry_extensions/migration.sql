-- AlterTable
ALTER TABLE "SalesChannelEntry" ADD COLUMN     "posSourceId" TEXT,
ADD COLUMN     "transactionCount" INTEGER;

-- CreateTable
CREATE TABLE "PosSource" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSource_restaurantId_idx" ON "PosSource"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "PosSource_restaurantId_name_key" ON "PosSource"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "SalesChannelEntry_posSourceId_idx" ON "SalesChannelEntry"("posSourceId");

-- AddForeignKey
ALTER TABLE "SalesChannelEntry" ADD CONSTRAINT "SalesChannelEntry_posSourceId_fkey" FOREIGN KEY ("posSourceId") REFERENCES "PosSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSource" ADD CONSTRAINT "PosSource_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
