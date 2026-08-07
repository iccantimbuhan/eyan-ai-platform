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
    return prisma.salesChannelEntry.findUnique({
      where: { id },
      include: { salesChannel: true, posSource: true },
    });
  }

  // findFirst, not findUnique on the compound key, because the unique
  // constraint is now (dailySalesRecordId, salesChannelId, posSourceId) —
  // Postgres treats NULL as distinct in a unique index, so a findUnique
  // equality lookup with posSourceId: null would not reliably catch a
  // duplicate no-POS entry. A plain `where` equality match (Prisma renders
  // `posSourceId: null` as `IS NULL`) is correct for both the tagged and
  // untagged case.
  async findByRecordAndChannel(dailySalesRecordId: string, salesChannelId: string, posSourceId: string | null) {
    return prisma.salesChannelEntry.findFirst({
      where: { dailySalesRecordId, salesChannelId, posSourceId },
    });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    salesChannelId: string;
    // POS Source / Sales Channel Flexibility — optional per-entry POS
    // terminal, never a fixed channel-to-POS mapping (see schema comment).
    posSourceId?: string | null;
    amount: Prisma.Decimal | string | number;
    transactionCount?: number | null;
  }) {
    return prisma.salesChannelEntry.create({ data, include: { salesChannel: true, posSource: true } });
  }

  async delete(id: string) {
    return prisma.salesChannelEntry.delete({ where: { id } });
  }
}

export class SalesPaymentMethodEntryRepository {
  async findById(id: string) {
    return prisma.salesPaymentMethodEntry.findUnique({
      where: { id },
      include: { salesPaymentMethod: true, posSource: true },
    });
  }

  // findFirst — same NULL-safety reasoning as SalesChannelEntryRepository's
  // findByRecordAndChannel above.
  async findByRecordAndMethod(dailySalesRecordId: string, salesPaymentMethodId: string, posSourceId: string | null) {
    return prisma.salesPaymentMethodEntry.findFirst({
      where: { dailySalesRecordId, salesPaymentMethodId, posSourceId },
    });
  }

  async create(data: {
    dailySalesRecordId: string;
    branchId: string;
    salesPaymentMethodId: string;
    // POS Source / Sales Channel Flexibility — optional per-entry POS
    // terminal, mirrors SalesChannelEntry.posSourceId exactly.
    posSourceId?: string | null;
    amount: Prisma.Decimal | string | number;
    transactionCount?: number | null;
  }) {
    return prisma.salesPaymentMethodEntry.create({ data, include: { salesPaymentMethod: true, posSource: true } });
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
    // POS-reported %QT/%SALE, transcribed as-is — distinct from Sprint 2D's
    // computed analytics percentages. Optional: not every entry comes from
    // a POS report.
    posQuantityPercent?: Prisma.Decimal | string | number | null;
    posSalesPercent?: Prisma.Decimal | string | number | null;
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
