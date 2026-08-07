-- CreateEnum
CREATE TYPE "SalesSource" AS ENUM ('MANUAL', 'POS_REPORT');

-- CreateEnum
CREATE TYPE "PosReportType" AS ENUM ('Z_REPORT', 'X_REPORT');

-- CreateTable
CREATE TABLE "SalesChannel" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPaymentMethod" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCategory" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalesRecord" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "source" "SalesSource" NOT NULL,
    "posReportType" "PosReportType",
    "posReportNumber" TEXT,
    "posReportedTotal" DECIMAL(10,2),
    "totalSales" DECIMAL(10,2) NOT NULL,
    "discountsTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vouchersAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vouchersCount" INTEGER,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesChannelEntry" (
    "id" TEXT NOT NULL,
    "dailySalesRecordId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesChannelEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPaymentMethodEntry" (
    "id" TEXT NOT NULL,
    "dailySalesRecordId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "salesPaymentMethodId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesPaymentMethodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCategoryEntry" (
    "id" TEXT NOT NULL,
    "dailySalesRecordId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "salesCategoryId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesCategoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesItemEntry" (
    "id" TEXT NOT NULL,
    "dailySalesRecordId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "categoryName" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesItemEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesChannel_restaurantId_idx" ON "SalesChannel"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannel_restaurantId_name_key" ON "SalesChannel"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "SalesPaymentMethod_restaurantId_idx" ON "SalesPaymentMethod"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPaymentMethod_restaurantId_name_key" ON "SalesPaymentMethod"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "SalesCategory_restaurantId_idx" ON "SalesCategory"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCategory_restaurantId_name_key" ON "SalesCategory"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "DailySalesRecord_branchId_idx" ON "DailySalesRecord"("branchId");

-- CreateIndex
CREATE INDEX "DailySalesRecord_restaurantId_idx" ON "DailySalesRecord"("restaurantId");

-- CreateIndex
CREATE INDEX "DailySalesRecord_businessDate_idx" ON "DailySalesRecord"("businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesRecord_branchId_businessDate_key" ON "DailySalesRecord"("branchId", "businessDate");

-- CreateIndex
CREATE INDEX "SalesChannelEntry_dailySalesRecordId_idx" ON "SalesChannelEntry"("dailySalesRecordId");

-- CreateIndex
CREATE INDEX "SalesChannelEntry_branchId_idx" ON "SalesChannelEntry"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannelEntry_dailySalesRecordId_salesChannelId_key" ON "SalesChannelEntry"("dailySalesRecordId", "salesChannelId");

-- CreateIndex
CREATE INDEX "SalesPaymentMethodEntry_dailySalesRecordId_idx" ON "SalesPaymentMethodEntry"("dailySalesRecordId");

-- CreateIndex
CREATE INDEX "SalesPaymentMethodEntry_branchId_idx" ON "SalesPaymentMethodEntry"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPaymentMethodEntry_dailySalesRecordId_salesPaymentMeth_key" ON "SalesPaymentMethodEntry"("dailySalesRecordId", "salesPaymentMethodId");

-- CreateIndex
CREATE INDEX "SalesCategoryEntry_dailySalesRecordId_idx" ON "SalesCategoryEntry"("dailySalesRecordId");

-- CreateIndex
CREATE INDEX "SalesCategoryEntry_branchId_idx" ON "SalesCategoryEntry"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCategoryEntry_dailySalesRecordId_salesCategoryId_key" ON "SalesCategoryEntry"("dailySalesRecordId", "salesCategoryId");

-- CreateIndex
CREATE INDEX "SalesItemEntry_dailySalesRecordId_idx" ON "SalesItemEntry"("dailySalesRecordId");

-- CreateIndex
CREATE INDEX "SalesItemEntry_branchId_idx" ON "SalesItemEntry"("branchId");

-- CreateIndex
CREATE INDEX "SalesItemEntry_menuItemId_idx" ON "SalesItemEntry"("menuItemId");

-- AddForeignKey
ALTER TABLE "SalesChannel" ADD CONSTRAINT "SalesChannel_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentMethod" ADD CONSTRAINT "SalesPaymentMethod_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCategory" ADD CONSTRAINT "SalesCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesRecord" ADD CONSTRAINT "DailySalesRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesRecord" ADD CONSTRAINT "DailySalesRecord_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesRecord" ADD CONSTRAINT "DailySalesRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannelEntry" ADD CONSTRAINT "SalesChannelEntry_dailySalesRecordId_fkey" FOREIGN KEY ("dailySalesRecordId") REFERENCES "DailySalesRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannelEntry" ADD CONSTRAINT "SalesChannelEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesChannelEntry" ADD CONSTRAINT "SalesChannelEntry_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentMethodEntry" ADD CONSTRAINT "SalesPaymentMethodEntry_dailySalesRecordId_fkey" FOREIGN KEY ("dailySalesRecordId") REFERENCES "DailySalesRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentMethodEntry" ADD CONSTRAINT "SalesPaymentMethodEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPaymentMethodEntry" ADD CONSTRAINT "SalesPaymentMethodEntry_salesPaymentMethodId_fkey" FOREIGN KEY ("salesPaymentMethodId") REFERENCES "SalesPaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCategoryEntry" ADD CONSTRAINT "SalesCategoryEntry_dailySalesRecordId_fkey" FOREIGN KEY ("dailySalesRecordId") REFERENCES "DailySalesRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCategoryEntry" ADD CONSTRAINT "SalesCategoryEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCategoryEntry" ADD CONSTRAINT "SalesCategoryEntry_salesCategoryId_fkey" FOREIGN KEY ("salesCategoryId") REFERENCES "SalesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesItemEntry" ADD CONSTRAINT "SalesItemEntry_dailySalesRecordId_fkey" FOREIGN KEY ("dailySalesRecordId") REFERENCES "DailySalesRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesItemEntry" ADD CONSTRAINT "SalesItemEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesItemEntry" ADD CONSTRAINT "SalesItemEntry_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
