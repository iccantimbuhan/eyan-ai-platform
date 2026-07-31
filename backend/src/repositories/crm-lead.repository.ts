import { prisma } from "../lib/prisma.js";
import type { LeadPriority, LeadSource, LeadStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateLeadData {
  source: LeadSource;
  contactName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  companySize?: string | null;
  rawSubmission: Prisma.InputJsonValue;
}

export interface UpdateLeadFieldsData {
  contactName?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  companySize?: string | null;
}

export interface UpdateLeadStatusData {
  status: LeadStatus;
  priority?: LeadPriority;
  lostReason?: string | null;
}

// Workflow 3/4's write-back (ADR-0019) — status, score, and priority move
// together as one automated qualification result, unlike the user-facing
// updateStatus/assign split which are separate rep actions.
export interface UpdateLeadQualificationData {
  status: LeadStatus;
  score: number;
  priority: LeadPriority;
}

export interface ListLeadsOptions {
  skip: number;
  take: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedToId?: string;
  search?: string;
  sortBy: "createdAt" | "score" | "contactName";
  sortDir: "asc" | "desc";
}

function buildWhere(options: {
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedToId?: string;
  search?: string;
}): Prisma.LeadWhereInput {
  return {
    ...(options.status ? { status: options.status } : {}),
    ...(options.priority ? { priority: options.priority } : {}),
    ...(options.assignedToId ? { assignedToId: options.assignedToId } : {}),
    ...(options.search
      ? {
          OR: [
            { contactName: { contains: options.search, mode: "insensitive" } },
            { email: { contains: options.search, mode: "insensitive" } },
            { company: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

const DETAIL_INCLUDE = {
  activities: { orderBy: { createdAt: "desc" as const } },
  aiAnalyses: { orderBy: { createdAt: "desc" as const } },
  executionLogs: { orderBy: { createdAt: "desc" as const } },
};

export class CrmLeadRepository {
  async create(data: CreateLeadData) {
    return prisma.lead.create({ data });
  }

  async findById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
  }

  async findByEmail(email: string) {
    return prisma.lead.findFirst({ where: { email } });
  }

  async updateFields(id: string, data: UpdateLeadFieldsData) {
    return prisma.lead.update({ where: { id }, data });
  }

  async updateStatus(id: string, data: UpdateLeadStatusData) {
    return prisma.lead.update({ where: { id }, data });
  }

  async updateAssignment(id: string, assignedToId: string | null) {
    return prisma.lead.update({ where: { id }, data: { assignedToId } });
  }

  async updateQualification(id: string, data: UpdateLeadQualificationData) {
    return prisma.lead.update({ where: { id }, data });
  }

  async findMany(options: ListLeadsOptions) {
    return prisma.lead.findMany({
      where: buildWhere(options),
      orderBy: { [options.sortBy]: options.sortDir },
      skip: options.skip,
      take: options.take,
    });
  }

  async count(options: {
    status?: LeadStatus;
    priority?: LeadPriority;
    assignedToId?: string;
    search?: string;
  }) {
    return prisma.lead.count({ where: buildWhere(options) });
  }
}

export const crmLeadRepository = new CrmLeadRepository();
