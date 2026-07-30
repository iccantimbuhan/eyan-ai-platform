import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export class FinanceBudgetRepository {
  async findByPeriod(period: string) {
    return prisma.budget.findUnique({ where: { period } });
  }

  async findMostRecentBefore(period: string) {
    return prisma.budget.findFirst({
      where: { period: { lt: period } },
      orderBy: { period: "desc" },
    });
  }

  async create(data: { period: string; monthlyLimit: Prisma.Decimal | string; createdBy?: string | null }) {
    return prisma.budget.create({ data });
  }

  async upsertByPeriod(data: {
    period: string;
    monthlyLimit: Prisma.Decimal | string;
    actorId?: string | null;
  }) {
    return prisma.budget.upsert({
      where: { period: data.period },
      create: {
        period: data.period,
        monthlyLimit: data.monthlyLimit,
        createdBy: data.actorId,
      },
      update: {
        monthlyLimit: data.monthlyLimit,
        updatedBy: data.actorId,
      },
    });
  }
}

export const financeBudgetRepository = new FinanceBudgetRepository();
