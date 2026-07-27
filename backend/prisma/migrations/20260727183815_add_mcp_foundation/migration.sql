-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "McpTransport" AS ENUM ('STDIO', 'HTTP', 'SSE');

-- CreateEnum
CREATE TYPE "McpHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'UNREACHABLE', 'ERROR');

-- CreateEnum
CREATE TYPE "AutomationAuditAction" AS ENUM ('CONNECTION_CREATED', 'CONNECTION_TESTED', 'CONNECTION_REVOKED', 'MCP_SERVER_REGISTERED', 'MCP_SERVER_UPDATED', 'MCP_SERVER_REMOVED', 'MCP_SERVER_HEALTH_CHECKED', 'CREDENTIAL_ACCESSED');

-- CreateTable
CREATE TABLE "AutomationConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "encryptedCredentials" TEXT NOT NULL,
    "credentialsIv" TEXT NOT NULL,
    "metadata" JSONB,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpServerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transport" "McpTransport" NOT NULL,
    "command" TEXT,
    "args" TEXT[],
    "url" TEXT,
    "connectionId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthStatus" "McpHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthMessage" TEXT,
    "config" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AutomationAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationConnection_userId_idx" ON "AutomationConnection"("userId");

-- CreateIndex
CREATE INDEX "AutomationConnection_provider_idx" ON "AutomationConnection"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationConnection_userId_provider_label_key" ON "AutomationConnection"("userId", "provider", "label");

-- CreateIndex
CREATE UNIQUE INDEX "McpServerConfig_name_key" ON "McpServerConfig"("name");

-- CreateIndex
CREATE INDEX "McpServerConfig_provider_idx" ON "McpServerConfig"("provider");

-- CreateIndex
CREATE INDEX "McpServerConfig_connectionId_idx" ON "McpServerConfig"("connectionId");

-- CreateIndex
CREATE INDEX "AutomationAuditEvent_actorId_idx" ON "AutomationAuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AutomationAuditEvent_targetType_targetId_idx" ON "AutomationAuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AutomationAuditEvent_createdAt_idx" ON "AutomationAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AutomationConnection" ADD CONSTRAINT "AutomationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerConfig" ADD CONSTRAINT "McpServerConfig_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "AutomationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServerConfig" ADD CONSTRAINT "McpServerConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAuditEvent" ADD CONSTRAINT "AutomationAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
