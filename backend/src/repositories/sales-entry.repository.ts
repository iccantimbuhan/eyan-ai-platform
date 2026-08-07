import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

// Four line-entry types belonging to a DailySalesRecord (Sales Foundation,
// Sprint 2C) — grouped in one file for the same reason as
// sales-reference.repository.ts. Each entry is added/removed individually
// (no update, no batch payload) — the manager deletes and re-adds a line
// rather than editing one in place, mirroring RecipeIngredient's own
// individual-line-CRUD shape but simplified further (no PATCH) since a
// sales line has no sub-fields worth editing separately from re-entering it.

export class SalesChannelEntryRepository {
  async findById(id: string) {
    return prisma.salesChannelEntry.findUnique({ where: { id }, include: { salesChannel: true } });
  }

  async findByRecordAndChannel(dailySalesRecordId: string, salesChannelId: string) {
    return prisma.salesChannelEntry.findUnique({
      where: { dailySalesRecordId_salesChannelId: { dailySalesRecordId, salesChannelId } },
    });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    salesChannelId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    return prisma.salesChannelEntry.create({ data, include: { salesChannel: true } });
  }

  async delete(id: string) {
    return prisma.salesChannelEntry.delete({ where: { id } });
  }
}

export class SalesPaymentMethodEntryRepository {
  async findById(id: string) {
    return prisma.salesPaymentMethodEntry.findUnique({
      where: { id },
      include: { salesPaymentMethod: true },
    });
  }

  async findByRecordAndMethod(dailySalesRecordId: string, salesPaymentMethodId: string) {
    return prisma.salesPaymentMethodEntry.findUnique({
      where: { dailySalesRecordId_salesPaymentMethodId: { dailySalesRecordId, salesPaymentMethodId } },
    });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    salesPaymentMethodId: string;
    amount: Prisma.Decimal | string | number;
    transactionCount?: number | null;
  }) {
    return prisma.salesPaymentMethodEntry.create({ data, include: { salesPaymentMethod: true } });
  }

  async delete(id: string) {
    return prisma.salesPaymentMethodEntry.delete({ where: { id } });
  }
}

export class SalesCategoryEntryRepository {
  async findById(id: string) {
    return prisma.salesCategoryEntry.findUnique({ where: { id }, include: { salesCategory: true } });
  }

  async findByRecordAndCategory(dailySalesRecordId: string, salesCategoryId: string) {
    return prisma.salesCategoryEntry.findUnique({
      where: { dailySalesRecordId_salesCategoryId: { dailySalesRecordId, salesCategoryId } },
    });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    salesCategoryId: string;
    quantity?: Prisma.Decimal | string | number | null;
    amount: Prisma.Decimal | string | number;
  }) {
    return prisma.salesCategoryEntry.create({ data, include: { salesCategory: true } });
  }

  async delete(id: string) {
    return prisma.salesCategoryEntry.delete({ where: { id } });
  }
}

export class SalesItemEntryRepository {
  async findById(id: string) {
    return prisma.salesItemEntry.findUnique({ where: { id } });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    menuItemId?: string | null;
    itemName: string;
    categoryName?: string | null;
    quantity: Prisma.Decimal | string | number;
    amount: Prisma.Decimal | string | number;
  }) {
    return prisma.salesItemEntry.create({ data });
  }

  async delete(id: string) {
    return prisma.salesItemEntry.delete({ where: { id } });
  }
}

export const salesChannelEntryRepository = new SalesChannelEntryRepository();
export const salesPaymentMethodEntryRepository = new SalesPaymentMethodEntryRepository();
export const salesCategoryEntryRepository = new SalesCategoryEntryRepository();
export const salesItemEntryRepository = new SalesItemEntryRepository();
