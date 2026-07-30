-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('HOUSING', 'FOOD', 'UTILITIES', 'TRANSPORTATION', 'SHOPPING', 'MEDICAL', 'CREDIT_CARD', 'SAVINGS', 'TAX', 'OTHERS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "FinanceAuditAction" AS ENUM ('EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'RECURRING_EXPENSE_TEMPLATE_CREATED', 'RECURRING_EXPENSE_TEMPLATE_DEACTIVATED', 'BUDGET_SET');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "householdId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "description" TEXT,
    "receiptPath" TEXT,
    "recurringTemplateId" TEXT,
    "period" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpenseTemplate" (
    "id" TEXT NOT NULL,
    "householdId" TEXT,
    "name" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedPeriod" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "householdId" TEXT,
    "period" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(10,2) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "FinanceAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_recurringTemplateId_idx" ON "Expense"("recurringTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringTemplateId_period_key" ON "Expense"("recurringTemplateId", "period");

-- CreateIndex
CREATE INDEX "RecurringExpenseTemplate_isActive_idx" ON "RecurringExpenseTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_period_key" ON "Budget"("period");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_actorId_idx" ON "FinanceAuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_targetType_targetId_idx" ON "FinanceAuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_createdAt_idx" ON "FinanceAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringExpenseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAuditEvent" ADD CONSTRAINT "FinanceAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
