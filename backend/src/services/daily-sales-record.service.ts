import {
  dailySalesRecordRepository,
  DailySalesRecordRepository,
} from "../repositories/daily-sales-record.repository.js";
import { branchRepository as defaultBranchRepository, BranchRepository } from "../repositories/branch.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { DailySalesRecordAlreadyExistsError } from "../errors/sales.error.js";
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
    private readonly branchRepository: BranchRepository = defaultBranchRepository
  ) {}

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
      notes: data.notes ?? null,
      createdById,
    });

    return mapDailySalesRecordToResponse(row);
  }

  async update(id: string, data: UpdateDailySalesRecordDto) {
    await this.getById(id);

    const row = await this.repository.update(id, {
      source: data.source,
      posReportType: data.posReportType,
      posReportNumber: data.posReportNumber,
      posReportedTotal: data.posReportedTotal,
      totalSales: data.totalSales,
      discountsTotal: data.discountsTotal,
      vouchersAmount: data.vouchersAmount,
      vouchersCount: data.vouchersCount,
      notes: data.notes,
    });

    return mapDailySalesRecordToResponse(row);
  }
}

export const dailySalesRecordService = new DailySalesRecordService();
