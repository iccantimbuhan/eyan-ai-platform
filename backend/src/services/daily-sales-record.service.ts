import {
  dailySalesRecordRepository,
  DailySalesRecordRepository,
} from "../repositories/daily-sales-record.repository.js";
import { branchRepository as defaultBranchRepository, BranchRepository } from "../repositories/branch.repository.js";
import {
  posSourceRepository as defaultPosSourceRepository,
  PosSourceRepository,
} from "../repositories/sales-reference.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  DailySalesRecordAlreadyExistsError,
  InvalidCashDiscountError,
  SalesScopeMismatchError,
} from "../errors/sales.error.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  mapDailySalesRecordToListItem,
  mapDailySalesRecordToResponse,
} from "../dto/daily-sales-record.mapper.js";
import type { CreateDailySalesRecordDto, UpdateDailySalesRecordDto } from "../dto/daily-sales-record.dto.js";

// businessDate arrives as a "YYYY-MM-DD" string (or a Date from a query
// param) and is truncated to UTC midnight before every read/write — the
// @@unique([branchId, businessDate]) constraint (ADR-0039 Decision 1) only
// works as "one record per calendar day" if every write lands on the exact
// same instant regardless of what time of day the request arrives.
export function truncateToUtcDate(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export class DailySalesRecordService {
  constructor(
    private readonly repository: DailySalesRecordRepository = dailySalesRecordRepository,
    private readonly branchRepository: BranchRepository = defaultBranchRepository,
    private readonly posSourceRepository: PosSourceRepository = defaultPosSourceRepository
  ) {}

  // discountPosSourceId (ADR-0043 amendment) is a client-supplied FK like
  // any entry-level posSourceId — validated against the record's own
  // restaurant the same way sales-entry.service.ts validates every other
  // client-supplied master-list FK, so a discount can never be scoped to a
  // POS source belonging to a different restaurant.
  private async assertDiscountPosSourceScope(discountPosSourceId: string | null | undefined, restaurantId: string) {
    if (!discountPosSourceId) return;

    const posSource = await this.posSourceRepository.findById(discountPosSourceId);
    if (!posSource || posSource.restaurantId !== restaurantId) {
      throw new SalesScopeMismatchError("This POS source does not belong to the given branch's restaurant.");
    }
  }

  // cashDiscountTotal (ADR-0043 second amendment) is meant to be
  // discountsTotal's cash-only portion, so it can never exceed the total it
  // is a portion of. undefined means "not being set/changed" — skipped.
  private assertCashDiscountWithinTotal(
    cashDiscountTotal: number | string | null | undefined,
    discountsTotal: number | string
  ) {
    if (cashDiscountTotal === null || cashDiscountTotal === undefined) return;

    if (new Prisma.Decimal(cashDiscountTotal).greaterThan(new Prisma.Decimal(discountsTotal))) {
      throw new InvalidCashDiscountError();
    }
  }

  async list(branchId: string) {
    const rows = await this.repository.findManyByBranchId(branchId);
    return rows.map(mapDailySalesRecordToListItem);
  }

  async getById(id: string) {
    const row = await this.repository.findById(id);

    if (!row) {
      throw new NotFoundError("Daily sales record not found.");
    }

    return mapDailySalesRecordToResponse(row);
  }

  async getDaily(branchId: string, date: string) {
    const row = await this.repository.findByBranchAndDate(branchId, truncateToUtcDate(date));

    if (!row) {
      throw new NotFoundError("No sales recorded for this branch on this date.");
    }

    return mapDailySalesRecordToResponse(row);
  }

  async create(branchId: string, data: CreateDailySalesRecordDto, createdById: string) {
    const branch = await this.branchRepository.findById(branchId);

    if (!branch) {
      throw new NotFoundError("Branch not found.");
    }

    const businessDate = truncateToUtcDate(data.businessDate);

    const existing = await this.repository.findByBranchAndDate(branchId, businessDate);
    if (existing) {
      throw new DailySalesRecordAlreadyExistsError();
    }

    await this.assertDiscountPosSourceScope(data.discountPosSourceId, branch.restaurantId);
    this.assertCashDiscountWithinTotal(data.cashDiscountTotal, data.discountsTotal ?? 0);

    const row = await this.repository.create({
      branchId,
      restaurantId: branch.restaurantId,
      businessDate,
      source: data.source,
      posReportType: data.posReportType ?? null,
      posReportNumber: data.posReportNumber ?? null,
      posReportedTotal: data.posReportedTotal ?? null,
      totalSales: data.totalSales,
      discountsTotal: data.discountsTotal ?? 0,
      vouchersAmount: data.vouchersAmount ?? 0,
      vouchersCount: data.vouchersCount ?? null,
      actualCashCounted: data.actualCashCounted ?? null,
      discountPosSourceId: data.discountPosSourceId ?? null,
      cashDiscountTotal: data.cashDiscountTotal ?? null,
      notes: data.notes ?? null,
      createdById,
    });

    return mapDailySalesRecordToResponse(row);
  }

  async update(id: string, data: UpdateDailySalesRecordDto) {
    const existing = await this.getById(id);

    await this.assertDiscountPosSourceScope(data.discountPosSourceId, existing.restaurantId);
    // Effective post-update value of each field: the incoming change if
    // provided, otherwise whatever the record already has — so a partial
    // update that only touches cashDiscountTotal is still checked against
    // the record's real (possibly unchanged) discountsTotal, and vice versa.
    const effectiveDiscountsTotal = data.discountsTotal ?? existing.discountsTotal;
    const effectiveCashDiscountTotal =
      data.cashDiscountTotal !== undefined ? data.cashDiscountTotal : existing.cashDiscountTotal;
    this.assertCashDiscountWithinTotal(effectiveCashDiscountTotal, effectiveDiscountsTotal);

    const row = await this.repository.update(id, {
      source: data.source,
      posReportType: data.posReportType,
      posReportNumber: data.posReportNumber,
      posReportedTotal: data.posReportedTotal,
      totalSales: data.totalSales,
      discountsTotal: data.discountsTotal,
      vouchersAmount: data.vouchersAmount,
      vouchersCount: data.vouchersCount,
      actualCashCounted: data.actualCashCounted,
      discountPosSourceId: data.discountPosSourceId,
      cashDiscountTotal: data.cashDiscountTotal,
      notes: data.notes,
    });

    return mapDailySalesRecordToResponse(row);
  }
}

export const dailySalesRecordService = new DailySalesRecordService();
