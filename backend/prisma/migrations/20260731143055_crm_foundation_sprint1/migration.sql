-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE_FORM', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'VALIDATED', 'DISQUALIFIED', 'AI_ANALYZED', 'QUALIFIED', 'CONTACTED', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'STATUS_CHANGE', 'AI_ANALYSIS', 'AUTOMATION', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "QualificationLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EstimatedTimeline" AS ENUM ('IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE_FORM',
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER,
    "priority" "LeadPriority",
    "assignedToId" TEXT,
    "lostReason" TEXT,
    "rawSubmission" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "actorId" TEXT,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAiAnalysis" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "leadScore" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" "LeadPriority" NOT NULL,
    "industry" TEXT,
    "companySizeEstimate" TEXT,
    "budgetEstimateMin" DECIMAL(10,2),
    "budgetEstimateMax" DECIMAL(10,2),
    "budgetEstimateCurrency" TEXT,
    "buyingIntent" "QualificationLevel",
    "urgency" "QualificationLevel",
    "decisionMakerIdentified" BOOLEAN,
    "estimatedTimeline" "EstimatedTimeline",
    "riskLevel" "QualificationLevel",
    "painPoints" TEXT[],
    "recommendedAction" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecutionLog" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'crm',
    "workflowName" TEXT NOT NULL,
    "leadId" TEXT,
    "n8nExecutionId" TEXT,
    "status" "WorkflowExecutionStatus" NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_type_idx" ON "LeadActivity"("type");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- CreateIndex
CREATE INDEX "LeadAiAnalysis_leadId_idx" ON "LeadAiAnalysis"("leadId");

-- CreateIndex
CREATE INDEX "LeadAiAnalysis_createdAt_idx" ON "LeadAiAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowExecutionLog_domain_idx" ON "WorkflowExecutionLog"("domain");

-- CreateIndex
CREATE INDEX "WorkflowExecutionLog_leadId_idx" ON "WorkflowExecutionLog"("leadId");

-- CreateIndex
CREATE INDEX "WorkflowExecutionLog_status_idx" ON "WorkflowExecutionLog"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecutionLog_createdAt_idx" ON "WorkflowExecutionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAiAnalysis" ADD CONSTRAINT "LeadAiAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionLog" ADD CONSTRAINT "WorkflowExecutionLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
