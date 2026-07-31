-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('LOCAL', 'HOSTED');

-- CreateEnum
CREATE TYPE "AiMemoryStrategy" AS ENUM ('NONE', 'CONVERSATION', 'KNOWLEDGE_BASE', 'VECTOR', 'RAG', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "AiRoutingStrategy" AS ENUM ('COST', 'LATENCY', 'QUALITY', 'BALANCED');

-- CreateEnum
CREATE TYPE "AiCallOutcome" AS ENUM ('VALID', 'SCHEMA_INVALID', 'TRANSIENT_FAILURE', 'DEFINITIVE_FAILURE');

-- CreateEnum
CREATE TYPE "AiAuditAction" AS ENUM ('BRAIN_CREATED', 'BRAIN_UPDATED', 'BRAIN_DELETED', 'CAPABILITY_CREATED', 'CAPABILITY_UPDATED', 'CAPABILITY_DELETED', 'PROVIDER_CREATED', 'PROVIDER_UPDATED', 'PROVIDER_CREDENTIAL_ADDED', 'PROVIDER_CREDENTIAL_ACCESSED', 'PROVIDER_CREDENTIAL_ROTATED', 'ROUTING_POLICY_CHANGED', 'PROMPT_VERSION_CREATED', 'PROMPT_VERSION_ACTIVATED', 'PROMPT_VERSION_ROLLED_BACK', 'MCP_TOOL_ALLOWANCE_CHANGED');

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "kind" "AiProviderKind" NOT NULL,
    "baseUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerMinute" INTEGER,
    "healthStatus" "McpHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "credentialsIv" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tags" TEXT[],
    "contextWindow" INTEGER,
    "costPerInputToken" DECIMAL(12,8),
    "costPerOutputToken" DECIMAL(12,8),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBrain" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "memoryStrategy" "AiMemoryStrategy" NOT NULL DEFAULT 'NONE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCapability" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brainId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrompt" (
    "id" TEXT NOT NULL,
    "brainId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRoutingPolicy" (
    "id" TEXT NOT NULL,
    "brainId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "strategy" "AiRoutingStrategy" NOT NULL DEFAULT 'BALANCED',
    "requiredTag" TEXT,
    "preferredProviderId" TEXT NOT NULL,
    "preferredModelId" TEXT NOT NULL,
    "fallbackProviderId" TEXT,
    "fallbackModelId" TEXT,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 60000,
    "confidenceHighThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "confidenceMediumThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRoutingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBrainMcpTool" (
    "id" TEXT NOT NULL,
    "brainId" TEXT NOT NULL,
    "mcpServerConfigId" TEXT NOT NULL,
    "allowedTools" TEXT[],

    CONSTRAINT "AiBrainMcpTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "brainId" TEXT,
    "capabilityId" TEXT,
    "providerId" TEXT,
    "modelId" TEXT,
    "workflowExecutionId" TEXT,
    "domain" TEXT NOT NULL DEFAULT 'ai-core',
    "outcome" "AiCallOutcome" NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" DECIMAL(10,6),
    "latencyMs" INTEGER,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEvaluation" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "testCaseName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expectedShape" JSONB,
    "actualOutput" JSONB,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AiAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_key_key" ON "AiProvider"("key");

-- CreateIndex
CREATE INDEX "AiProvider_kind_idx" ON "AiProvider"("kind");

-- CreateIndex
CREATE INDEX "AiProviderCredential_providerId_idx" ON "AiProviderCredential"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderCredential_providerId_label_key" ON "AiProviderCredential"("providerId", "label");

-- CreateIndex
CREATE INDEX "AiModel_providerId_idx" ON "AiModel"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_providerId_modelKey_key" ON "AiModel"("providerId", "modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiBrain_key_key" ON "AiBrain"("key");

-- CreateIndex
CREATE INDEX "AiBrain_category_idx" ON "AiBrain"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AiCapability_key_key" ON "AiCapability"("key");

-- CreateIndex
CREATE INDEX "AiCapability_brainId_idx" ON "AiCapability"("brainId");

-- CreateIndex
CREATE INDEX "AiPrompt_brainId_idx" ON "AiPrompt"("brainId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPrompt_brainId_version_key" ON "AiPrompt"("brainId", "version");

-- CreateIndex
CREATE INDEX "AiRoutingPolicy_brainId_idx" ON "AiRoutingPolicy"("brainId");

-- CreateIndex
CREATE INDEX "AiRoutingPolicy_preferredProviderId_idx" ON "AiRoutingPolicy"("preferredProviderId");

-- CreateIndex
CREATE INDEX "AiBrainMcpTool_brainId_idx" ON "AiBrainMcpTool"("brainId");

-- CreateIndex
CREATE UNIQUE INDEX "AiBrainMcpTool_brainId_mcpServerConfigId_key" ON "AiBrainMcpTool"("brainId", "mcpServerConfigId");

-- CreateIndex
CREATE INDEX "AiUsageLog_brainId_idx" ON "AiUsageLog"("brainId");

-- CreateIndex
CREATE INDEX "AiUsageLog_capabilityId_idx" ON "AiUsageLog"("capabilityId");

-- CreateIndex
CREATE INDEX "AiUsageLog_providerId_idx" ON "AiUsageLog"("providerId");

-- CreateIndex
CREATE INDEX "AiUsageLog_domain_idx" ON "AiUsageLog"("domain");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiEvaluation_promptId_idx" ON "AiEvaluation"("promptId");

-- CreateIndex
CREATE INDEX "AiAuditEvent_actorId_idx" ON "AiAuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AiAuditEvent_targetType_targetId_idx" ON "AiAuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiAuditEvent_createdAt_idx" ON "AiAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AiProviderCredential" ADD CONSTRAINT "AiProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCapability" ADD CONSTRAINT "AiCapability_brainId_fkey" FOREIGN KEY ("brainId") REFERENCES "AiBrain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPrompt" ADD CONSTRAINT "AiPrompt_brainId_fkey" FOREIGN KEY ("brainId") REFERENCES "AiBrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRoutingPolicy" ADD CONSTRAINT "AiRoutingPolicy_brainId_fkey" FOREIGN KEY ("brainId") REFERENCES "AiBrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRoutingPolicy" ADD CONSTRAINT "AiRoutingPolicy_preferredProviderId_fkey" FOREIGN KEY ("preferredProviderId") REFERENCES "AiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRoutingPolicy" ADD CONSTRAINT "AiRoutingPolicy_preferredModelId_fkey" FOREIGN KEY ("preferredModelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRoutingPolicy" ADD CONSTRAINT "AiRoutingPolicy_fallbackProviderId_fkey" FOREIGN KEY ("fallbackProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRoutingPolicy" ADD CONSTRAINT "AiRoutingPolicy_fallbackModelId_fkey" FOREIGN KEY ("fallbackModelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiBrainMcpTool" ADD CONSTRAINT "AiBrainMcpTool_brainId_fkey" FOREIGN KEY ("brainId") REFERENCES "AiBrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiBrainMcpTool" ADD CONSTRAINT "AiBrainMcpTool_mcpServerConfigId_fkey" FOREIGN KEY ("mcpServerConfigId") REFERENCES "McpServerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_brainId_fkey" FOREIGN KEY ("brainId") REFERENCES "AiBrain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "AiCapability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEvaluation" ADD CONSTRAINT "AiEvaluation_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "AiPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAuditEvent" ADD CONSTRAINT "AiAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
