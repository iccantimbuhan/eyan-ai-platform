import { prisma } from "../lib/prisma.js";
import type { ExpenseCategory } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateRecurringExpenseTemplateData {
  name: string;
  category: ExpenseCategory;
  amount: Prisma.Decimal | string;
  dayOfMonth: number;
  startDate: Date;
  lastGeneratedPeriod?: string | null;
  createdBy?: string | null;
}

export class FinanceRecurringExpenseTemplateRepository {
  async create(data: CreateRecurringExpenseTemplateData) {
    return prisma.recurringExpenseTemplate.create({ data });
  }

  async findActive() {
    return prisma.recurringExpenseTemplate.findMany({
      where: { isActive: true },
    });
  }

  async updateLastGeneratedPeriod(id: string, period: string) {
    return prisma.recurringExpenseTemplate.update({
      where: { id },
      data: { lastGeneratedPeriod: period },
    });
  }
}

export const financeRecurringExpenseTemplateRepository =
  new FinanceRecurringExpenseTemplateRepository();
