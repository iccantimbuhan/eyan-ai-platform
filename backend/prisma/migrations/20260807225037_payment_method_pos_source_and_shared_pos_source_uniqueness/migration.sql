-- DropIndex
DROP INDEX "SalesChannelEntry_dailySalesRecordId_salesChannelId_key";

-- DropIndex
DROP INDEX "SalesPaymentMethodEntry_dailySalesRecordId_salesPaymentMeth_key";

-- AlterTable
ALTER TABLE "SalesPaymentMethodEntry" ADD COLUMN     "posSourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannelEntry_dailySalesRecordId_salesChannelId_posSour_key" ON "SalesChannelEntry"("dailySalesRecordId", "salesChannelId", "posSourceId");

-- CreateIndex
CREATE INDEX "SalesPaymentMethodEntry_posSourceId_idx" ON "SalesPaymentMethodEntry"("posSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPaymentMethodEntry_dailySalesRecordId_salesPaymentMeth_key" ON "SalesPaymentMethodEntry"("dailySalesRecordId", "salesPaymentMethodId", "posSourceId");

-- AddForeignKey
ALTER TABLE "SalesPaymentMethodEntry" ADD CONSTRAINT "SalesPaymentMethodEntry_posSourceId_fkey" FOREIGN KEY ("posSourceId") REFERENCES "PosSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

