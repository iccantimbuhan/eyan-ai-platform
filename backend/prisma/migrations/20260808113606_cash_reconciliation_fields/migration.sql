-- AlterTable
ALTER TABLE "DailySalesRecord" ADD COLUMN     "actualCashCounted" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "SalesPaymentMethod" ADD COLUMN     "isCashEquivalent" BOOLEAN NOT NULL DEFAULT false;
