import { prisma } from "../lib/prisma.js";
import type { ConnectionStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAutomationConnectionData {
  userId: string;
  provider: string;
  label: string;
  encryptedCredentials: string;
  credentialsIv: string;
  status?: ConnectionStatus;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateAutomationConnectionData {
  label?: string;
  encryptedCredentials?: string;
  credentialsIv?: string;
  status?: ConnectionStatus;
  metadata?: Record<string, unknown> | null;
  lastVerifiedAt?: Date | null;
}

// Persistence only — encrypting/decrypting encryptedCredentials is the
// Credential Manager service's job (Milestone 4), never this repository's.
// Every read is scoped by userId in the query itself: an
// AutomationConnection is strictly private to its owner, so that scoping
// is enforced here rather than left to callers to remember.
export class AutomationConnectionRepository {
  async create(data: CreateAutomationConnectionData) {
    return prisma.automationConnection.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(id: string, data: UpdateAutomationConnectionData) {
    return prisma.automationConnection.update({
      where: { id },
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async delete(id: string) {
    return prisma.automationConnection.delete({
      where: { id },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.automationConnection.findFirst({
      where: { id, userId },
    });
  }

  // System-internal lookup with no ownership scoping. Only for
  // system-initiated processes (e.g. McpHealthService's health checks)
  // that must resolve a connection an McpServerConfig references without a
  // requesting user's id available — never call this from a user-facing
  // controller. Whether a given connection was allowed to be linked to
  // whatever is calling this was already enforced when that link was made.
  async findByIdForSystem(id: string) {
    return prisma.automationConnection.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string) {
    return prisma.automationConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByProvider(userId: string, provider: string) {
    return prisma.automationConnection.findMany({
      where: { userId, provider },
      orderBy: { createdAt: "desc" },
    });
  }

  async findActiveConnections(userId: string) {
    return prisma.automationConnection.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(
    id: string,
    status: ConnectionStatus,
    lastVerifiedAt?: Date
  ) {
    return prisma.automationConnection.update({
      where: { id },
      data: {
        status,
        ...(lastVerifiedAt ? { lastVerifiedAt } : {}),
      },
    });
  }
}

export const automationConnectionRepository = new AutomationConnectionRepository();
