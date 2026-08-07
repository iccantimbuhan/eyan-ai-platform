-- AlterTable
ALTER TABLE "SalesItemEntry" ADD COLUMN     "posQuantityPercent" DECIMAL(5,2),
ADD COLUMN     "posSalesPercent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "SalesChannelMenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesChannelMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesChannelMenuItem_restaurantId_idx" ON "SalesChannelMenuItem"("restaurantId");

-- CreateIndex
CREATE INDEX "SalesChannelMenuItem_salesChannelId_idx" ON "SalesChannelMenuItem"("salesChannelId");

-- CreateIndex
CREATE INDEX "SalesChannelMenuItem_menuItemId_idx" ON "SalesChannelMenuItem"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannelMenuItem_salesChannelId_menuItemId_key" ON "SalesChannelMenuItem"("salesChannelId", "menuItemId");

-- AddForeignKey
ALTER TABLE "SalesChannelMenuItem" ADD CONSTRAINT "SalesChannelMenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannelMenuItem" ADD CONSTRAINT "SalesChannelMenuItem_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannelMenuItem" ADD CONSTRAINT "SalesChannelMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
