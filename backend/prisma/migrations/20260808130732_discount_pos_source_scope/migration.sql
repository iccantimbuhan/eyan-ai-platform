-- AlterTable
ALTER TABLE "DailySalesRecord" ADD COLUMN     "discountPosSourceId" TEXT;

-- AddForeignKey
ALTER TABLE "DailySalesRecord" ADD CONSTRAINT "DailySalesRecord_discountPosSourceId_fkey" FOREIGN KEY ("discountPosSourceId") REFERENCES "PosSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
