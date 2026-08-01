import { prisma } from "../lib/prisma.js";
import type { AiConversationRole } from "../generated/prisma/client.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAiConversationData {
  brainId: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateAiConversationMessageData {
  conversationId: string;
  role: AiConversationRole;
  content: string;
}

// Sprint 4 — Conversation Engine persistence. Purely additive: no existing
// AI Core repository is touched by this file.
export class AiConversationRepository {
  async create(data: CreateAiConversationData) {
    return prisma.aiConversation.create({
      data: {
        brainId: data.brainId,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findByIdWithMessages(id: string) {
    return prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async appendMessage(data: CreateAiConversationMessageData) {
    return prisma.aiConversationMessage.create({ data });
  }

  async appendMessages(data: CreateAiConversationMessageData[]) {
    if (data.length === 0) return;
    await prisma.aiConversationMessage.createMany({ data });
  }

  // Bumps updatedAt so listByBrain can order by most-recently-active — a
  // message append doesn't touch its parent row automatically.
  async touch(id: string) {
    return prisma.aiConversation.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  async listByBrain(brainId: string) {
    return prisma.aiConversation.findMany({
      where: { brainId },
      orderBy: { updatedAt: "desc" },
    });
  }
}

export const aiConversationRepository = new AiConversationRepository();
