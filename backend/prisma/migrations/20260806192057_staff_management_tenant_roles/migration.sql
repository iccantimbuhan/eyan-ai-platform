-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantRole" ADD VALUE 'SUPERVISOR';
ALTER TYPE "TenantRole" ADD VALUE 'CASHIER';
ALTER TYPE "TenantRole" ADD VALUE 'KITCHEN';
ALTER TYPE "TenantRole" ADD VALUE 'INVENTORY_STAFF';
ALTER TYPE "TenantRole" ADD VALUE 'ACCOUNTANT';

-- CreateTable
CREATE TABLE "BranchMember" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchMember_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateIndex
CREATE INDEX "BranchMember_userId_idx" ON "BranchMember"("userId");

-- AddForeignKey
ALTER TABLE "BranchMember" ADD CONSTRAINT "BranchMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMember" ADD CONSTRAINT "BranchMember_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
