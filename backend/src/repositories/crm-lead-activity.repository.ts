import { prisma } from "../lib/prisma.js";
import type { LeadActivityType } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateLeadActivityData {
  leadId: string;
  type: LeadActivityType;
  actorId?: string | null;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export class CrmLeadActivityRepository {
  async create(data: CreateLeadActivityData) {
    return prisma.leadActivity.create({ data });
  }

  async findManyForLead(leadId: string) {
    return prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const crmLeadActivityRepository = new CrmLeadActivityRepository();
