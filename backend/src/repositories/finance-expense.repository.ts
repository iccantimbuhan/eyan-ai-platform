import { prisma } from "../lib/prisma.js";
import type { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateExpenseData {
  date: Date;
  amount: Prisma.Decimal | string;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod | null;
  description?: string | null;
  recurringTemplateId?: string | null;
  period?: string | null;
  createdBy?: string | null;
}

export interface UpdateExpenseData {
  date?: Date;
  amount?: Prisma.Decimal | string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod | null;
  description?: string | null;
  updatedBy?: string | null;
}

export interface ListExpensesOptions {
  skip: number;
  take: number;
  category?: ExpenseCategory;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy: "date" | "amount" | "createdAt";
  sortDir: "asc" | "desc";
}

function buildWhere(options: {
  category?: ExpenseCategory;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}): Prisma.ExpenseWhereInput {
  return {
    ...(options.category ? { category: options.category } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          date: {
            ...(options.dateFrom ? { gte: options.dateFrom } : {}),
            ...(options.dateTo ? { lte: options.dateTo } : {}),
          },
        }
      : {}),
    ...(options.search
      ? {
          description: {
            contains: options.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
}

export class FinanceExpenseRepository {
  async create(data: CreateExpenseData) {
    return prisma.expense.create({ data });
  }

  async findById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateExpenseData) {
    return prisma.expense.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.expense.delete({ where: { id } });
  }

  async findMany(options: ListExpensesOptions) {
    return prisma.expense.findMany({
      where: buildWhere(options),
      orderBy: { [options.sortBy]: options.sortDir },
      skip: options.skip,
      take: options.take,
    });
  }

  async count(options: {
    category?: ExpenseCategory;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  }) {
    return prisma.expense.count({ where: buildWhere(options) });
  }

  async findRecent(take: number) {
    return prisma.expense.findMany({
      orderBy: { date: "desc" },
      take,
    });
  }

  async sumForPeriod(dateFrom: Date, dateTo: Date) {
    return prisma.expense.aggregate({
      where: { date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    });
  }

  async groupByCategoryForPeriod(dateFrom: Date, dateTo: Date) {
    return prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    });
  }

  // Idempotent insert for the lazy-generation engine — a
  // (recurringTemplateId, period) collision means this period was already
  // generated (including a genuine race between two concurrent requests),
  // so it's swallowed as a no-op rather than surfaced as an error.
  async createGeneratedInstance(data: CreateExpenseData) {
    try {
      return await prisma.expense.create({ data });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return null;
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export const financeExpenseRepository = new FinanceExpenseRepository();
