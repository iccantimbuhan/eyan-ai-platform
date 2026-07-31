import { prisma } from "../lib/prisma.js";

export interface CreateAiPromptData {
  brainId: string;
  version: string;
  body: string;
}

// Additive-only (ADR-0020 Decision 2) — there is no update() for `body`,
// only create() for a new version and activate() to flip which version is
// current. "Exactly one active version per brain" is enforced here via a
// single transaction (deactivate all, then activate one), not a DB
// constraint — same posture as every other isActive flag in this schema.
export class AiPromptRepository {
  async create(data: CreateAiPromptData) {
    return prisma.aiPrompt.create({ data });
  }

  async findById(id: string) {
    return prisma.aiPrompt.findUnique({ where: { id } });
  }

  async findByBrainAndVersion(brainId: string, version: string) {
    return prisma.aiPrompt.findUnique({ where: { brainId_version: { brainId, version } } });
  }

  async findActiveByBrain(brainId: string) {
    return prisma.aiPrompt.findFirst({ where: { brainId, isActive: true } });
  }

  async listByBrain(brainId: string) {
    return prisma.aiPrompt.findMany({
      where: { brainId },
      orderBy: { createdAt: "desc" },
    });
  }

  async activate(brainId: string, promptId: string) {
    return prisma.$transaction([
      prisma.aiPrompt.updateMany({ where: { brainId, isActive: true }, data: { isActive: false } }),
      prisma.aiPrompt.update({ where: { id: promptId }, data: { isActive: true } }),
    ]);
  }
}

export const aiPromptRepository = new AiPromptRepository();
