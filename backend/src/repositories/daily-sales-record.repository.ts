import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { PosReportType, SalesSource } from "../generated/prisma/enums.js";

// Full nested shape — every line type included, sorted for a stable display
// order. Used for single-record detail, daily lookup, and weekly
// aggregation (which needs every line across the date range to group by).
const fullInclude = {
  channelEntries: { include: { salesChannel: true }, orderBy: { createdAt: "asc" } },
  paymentMethodEntries: { include: { salesPaymentMethod: true }, orderBy: { createdAt: "asc" } },
  categoryEntries: { include: { salesCategory: true }, orderBy: { createdAt: "asc" } },
  itemEntries: { orderBy: { createdAt: "asc" } },
} as const;

export type DailySalesRecordWithLines = Prisma.DailySalesRecordGetPayload<{ include: typeof fullInclude }>;

export interface CreateDailySalesRecordData {
  branchId: string;
  restaurantId: string;
  businessDate: Date;
  source: SalesSource;
  posReportType?: PosReportType | null;
  posReportNumber?: string | null;
  posReportedTotal?: Prisma.Decimal | string | number | null;
  totalSales: Prisma.Decimal | string | number;
  discountsTotal: Prisma.Decimal | string | number;
  vouchersAmount: Prisma.Decimal | string | number;
  vouchersCount?: number | null;
  notes?: string | null;
  createdById: string;
}

export interface UpdateDailySalesRecordData {
  source?: SalesSource;
  posReportType?: PosReportType | null;
  posReportNumber?: string | null;
  posReportedTotal?: Prisma.Decimal | string | number | null;
  totalSales?: Prisma.Decimal | string | number;
  discountsTotal?: Prisma.Decimal | string | number;
  vouchersAmount?: Prisma.Decimal | string | number;
  vouchersCount?: number | null;
  notes?: string | null;
}

export class DailySalesRecordRepository {
  async findById(id: string) {
    return prisma.dailySalesRecord.findUnique({ where: { id }, include: fullInclude });
  }

  async findByBranchAndDate(branchId: string, businessDate: Date) {
    return prisma.dailySalesRecord.findUnique({
      where: { branchId_businessDate: { branchId, businessDate } },
      include: fullInclude,
    });
  }

  // List view — header fields only, no nested lines, matches how
  // Inventory's list omits movement history.
  async findManyByBranchId(branchId: string) {
    return prisma.dailySalesRecord.findMany({
      where: { branchId },
      orderBy: { businessDate: "desc" },
    });
  }

  async findManyByBranchIdAndDateRange(branchId: string, startDate: Date, endDate: Date) {
    return prisma.dailySalesRecord.findMany({
      where: { branchId, businessDate: { gte: startDate, lte: endDate } },
      include: fullInclude,
      orderBy: { businessDate: "asc" },
    });
  }

  async create(data: CreateDailySalesRecordData) {
    const record = await prisma.dailySalesRecord.create({ data });
    return this.findById(record.id) as Promise<DailySalesRecordWithLines>;
  }

  async update(id: string, data: UpdateDailySalesRecordData) {
    await prisma.dailySalesRecord.update({ where: { id }, data });
    return this.findById(id) as Promise<DailySalesRecordWithLines>;
  }
}

export const dailySalesRecordRepository = new DailySalesRecordRepository();
