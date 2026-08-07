import type { DailySalesRecordWithLines } from "../repositories/daily-sales-record.repository.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
  DailySalesRecordListItemDto,
  DailySalesRecordResponseDto,
} from "./daily-sales-record.dto.js";
import type { SalesReconciliationDto } from "./sales-aggregation.dto.js";

// Same reconciliation shape/reasoning as SalesAggregationService's weekly
// summary, computed for this one record — real Prisma.Decimal arithmetic,
// never mutates the underlying record (ADR-0039 Decision 2/3, spec §F).
function computeReconciliation(row: DailySalesRecordWithLines): SalesReconciliationDto {
  const channelEntriesTotal = row.channelEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0)
  );
  const hasPosReportedTotal = row.posReportedTotal !== null;

  return {
    totalSales: row.totalSales.toFixed(2),
    posReportedTotal: hasPosReportedTotal ? row.posReportedTotal!.toFixed(2) : null,
    posReportedRecordCount: hasPosReportedTotal ? 1 : 0,
    channelEntriesTotal: channelEntriesTotal.toFixed(2),
    varianceVsPosReportedTotal: hasPosReportedTotal
      ? row.totalSales.minus(row.posReportedTotal!).toFixed(2)
      : null,
    varianceVsChannelEntriesTotal: row.totalSales.minus(channelEntriesTotal).toFixed(2),
  };
}

// businessDate is stored as a UTC-midnight DateTime (see
// daily-sales-record.service.ts's truncateToUtcDate) — formatted back to a
// plain "YYYY-MM-DD" string using UTC fields so it round-trips exactly
// regardless of server/client timezone.
export function formatBusinessDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Decimal -> string boundary conversion happens only here, same convention
// as inventory-item.mapper.ts.
export function mapDailySalesRecordToResponse(
  row: DailySalesRecordWithLines
): DailySalesRecordResponseDto {
  return {
    id: row.id,
    branchId: row.branchId,
    restaurantId: row.restaurantId,
    businessDate: formatBusinessDate(row.businessDate),
    source: row.source,
    posReportType: row.posReportType,
    posReportNumber: row.posReportNumber,
    posReportedTotal: row.posReportedTotal ? row.posReportedTotal.toFixed(2) : null,
    totalSales: row.totalSales.toFixed(2),
    discountsTotal: row.discountsTotal.toFixed(2),
    vouchersAmount: row.vouchersAmount.toFixed(2),
    vouchersCount: row.vouchersCount,
    notes: row.notes,
    channels: row.channelEntries.map((entry) => ({
      id: entry.id,
      salesChannelId: entry.salesChannelId,
      channelName: entry.salesChannel.name,
      posSourceId: entry.posSourceId,
      posSourceName: entry.posSource ? entry.posSource.name : null,
      amount: entry.amount.toFixed(2),
      transactionCount: entry.transactionCount,
      createdAt: entry.createdAt,
    })),
    paymentMethods: row.paymentMethodEntries.map((entry) => ({
      id: entry.id,
      salesPaymentMethodId: entry.salesPaymentMethodId,
      paymentMethodName: entry.salesPaymentMethod.name,
      amount: entry.amount.toFixed(2),
      transactionCount: entry.transactionCount,
      createdAt: entry.createdAt,
    })),
    categories: row.categoryEntries.map((entry) => ({
      id: entry.id,
      salesCategoryId: entry.salesCategoryId,
      categoryName: entry.salesCategory.name,
      quantity: entry.quantity ? entry.quantity.toFixed(2) : null,
      amount: entry.amount.toFixed(2),
      createdAt: entry.createdAt,
    })),
    items: row.itemEntries.map((entry) => ({
      id: entry.id,
      menuItemId: entry.menuItemId,
      itemName: entry.itemName,
      categoryName: entry.categoryName,
      quantity: entry.quantity.toFixed(2),
      amount: entry.amount.toFixed(2),
      posQuantityPercent: entry.posQuantityPercent ? entry.posQuantityPercent.toFixed(2) : null,
      posSalesPercent: entry.posSalesPercent ? entry.posSalesPercent.toFixed(2) : null,
      createdAt: entry.createdAt,
    })),
    reconciliation: computeReconciliation(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapDailySalesRecordToListItem(row: {
  id: string;
  branchId: string;
  businessDate: Date;
  source: DailySalesRecordWithLines["source"];
  totalSales: DailySalesRecordWithLines["totalSales"];
  createdAt: Date;
}): DailySalesRecordListItemDto {
  return {
    id: row.id,
    branchId: row.branchId,
    businessDate: formatBusinessDate(row.businessDate),
    source: row.source,
    totalSales: row.totalSales.toFixed(2),
    createdAt: row.createdAt,
  };
}
