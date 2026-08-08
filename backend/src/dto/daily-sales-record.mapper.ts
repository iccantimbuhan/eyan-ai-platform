import type { DailySalesRecordWithLines } from "../repositories/daily-sales-record.repository.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
  DailySalesRecordListItemDto,
  DailySalesRecordResponseDto,
} from "./daily-sales-record.dto.js";
import type {
  CashPosSourceBreakdownDto,
  CashReconciliationDto,
  CashReconciliationStatus,
  SalesReconciliationDto,
} from "./sales-aggregation.dto.js";

// Key for the "no POS source specified" cash bucket — mirrors
// SalesAggregationService's own UNASSIGNED_POS_SOURCE_KEY constant exactly
// (kept as a separate local constant rather than a shared import to avoid a
// circular dependency, since that service already imports from this file).
// Never collides with a real PosSource id (cuid).
const UNASSIGNED_POS_SOURCE_KEY = "unassigned";

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

// Pure, Decimal-safe cash reconciliation (ADR-0043, amended for POS-scoped
// discounts and again for the cash/electronic discount split) — shared by
// the single-record mapper below and SalesAggregationService's per-day
// rollup, so the two never drift. Never mutates anything; totalSales is
// untouched.
//
// discountPosSourceId/discountPosSource identify which POS source the
// cash-reducing discount is scoped to (DailySalesRecord.discountPosSourceId).
// null means "all POS sources" — the legacy/global behavior every record
// created before that amendment already has, preserved exactly.
//
// cashDiscountTotal identifies how much of discountsTotal actually reduces
// physical cash (DailySalesRecord.cashDiscountTotal, second amendment).
// null means "not configured" — the entire discountsTotal reduces cash,
// which is the exact pre-existing formula, so every record created before
// this second amendment computes an identical result with zero backfill.
// When configured, only cashDiscountTotal (never the full discountsTotal)
// is subtracted from physical cash — the remainder is the electronic/card
// discount, surfaced separately as electronicDiscountTotal, never
// subtracted from cash.
//
// The overall expectedCash formula (physicalCashBasis - cashReducingDiscount)
// is IDENTICAL whether or not a POS scope is set, because summing gross
// cash across every bucket and then subtracting one flat discount produces
// the same total regardless of which bucket "owns" that subtraction for
// display purposes. Only the per-bucket breakdown (cashByPosSource) changes
// with the scope — this is deliberately display/audit information, never a
// second source of truth for the total.
export function computeCashReconciliation(
  paymentMethodEntries: DailySalesRecordWithLines["paymentMethodEntries"],
  discountsTotal: Prisma.Decimal,
  actualCashCounted: Prisma.Decimal | null,
  discountPosSourceId: string | null,
  discountPosSource: { name: string } | null,
  cashDiscountTotal: Prisma.Decimal | null = null
): CashReconciliationDto {
  const hasCashDiscountConfigured = cashDiscountTotal !== null;
  // The amount that actually reduces physical cash — the manager-configured
  // cash-only split when present, otherwise the full discountsTotal
  // (unchanged pre-existing behavior).
  const cashReducingDiscount = hasCashDiscountConfigured ? cashDiscountTotal : discountsTotal;
  const electronicDiscountTotal = hasCashDiscountConfigured
    ? discountsTotal.minus(cashDiscountTotal)
    : null;

  let physicalCashBasis = new Prisma.Decimal(0);
  let cardElectronicTotal = new Prisma.Decimal(0);

  const buckets = new Map<
    string,
    { posSourceId: string | null; posSourceName: string | null; grossCashBasis: Prisma.Decimal }
  >();

  for (const entry of paymentMethodEntries) {
    if (!entry.salesPaymentMethod.isCashEquivalent) {
      cardElectronicTotal = cardElectronicTotal.plus(entry.amount);
      continue;
    }

    physicalCashBasis = physicalCashBasis.plus(entry.amount);

    const key = entry.posSourceId ?? UNASSIGNED_POS_SOURCE_KEY;
    const existing = buckets.get(key);
    if (existing) {
      existing.grossCashBasis = existing.grossCashBasis.plus(entry.amount);
    } else {
      buckets.set(key, {
        posSourceId: entry.posSourceId,
        posSourceName: entry.posSource ? entry.posSource.name : null,
        grossCashBasis: new Prisma.Decimal(entry.amount),
      });
    }
  }

  // A discount can be scoped to a POS source that has no cash entries
  // recorded yet today — surface it anyway (grossCashBasis "0.00", expected
  // cash goes negative) rather than silently dropping the discount from the
  // breakdown, per the "never hide the calculation" auditability principle.
  if (discountPosSourceId && !buckets.has(discountPosSourceId)) {
    buckets.set(discountPosSourceId, {
      posSourceId: discountPosSourceId,
      posSourceName: discountPosSource ? discountPosSource.name : null,
      grossCashBasis: new Prisma.Decimal(0),
    });
  }

  const cashByPosSource: CashPosSourceBreakdownDto[] = Array.from(buckets.values())
    // The discount-scoped bucket sorts first so the UI can render its
    // "Discountable" section before the "Non-Discountable" ones — a stable
    // sort (Node/V8 guarantee since ES2019) otherwise preserves each
    // bucket's first-seen order.
    .sort((a, b) => {
      if (a.posSourceId === discountPosSourceId) return -1;
      if (b.posSourceId === discountPosSourceId) return 1;
      return 0;
    })
    .map((bucket) => {
      const isDiscountedBucket = discountPosSourceId !== null && bucket.posSourceId === discountPosSourceId;
      const discountApplied = isDiscountedBucket ? cashReducingDiscount : new Prisma.Decimal(0);
      return {
        posSourceId: bucket.posSourceId,
        posSourceName: bucket.posSourceName,
        grossCashBasis: bucket.grossCashBasis.toFixed(2),
        discountApplied: discountApplied.toFixed(2),
        expectedCash: bucket.grossCashBasis.minus(discountApplied).toFixed(2),
      };
    });

  const expectedCash = physicalCashBasis.minus(cashReducingDiscount);
  // == null (not !== null) deliberately catches both null and undefined —
  // real Prisma rows always send an explicit null for an unset nullable
  // column, but this function is also called with hand-built fixtures in
  // tests that may simply omit the field.
  const hasActualCashCounted = actualCashCounted != null;
  const discrepancy = hasActualCashCounted ? actualCashCounted.minus(expectedCash) : null;

  let status: CashReconciliationStatus;
  if (!hasActualCashCounted || discrepancy === null) {
    status = "NOT_COUNTED";
  } else if (discrepancy.isZero()) {
    status = "BALANCED";
  } else if (discrepancy.isNegative()) {
    status = "SHORT";
  } else {
    status = "OVER";
  }

  return {
    physicalCashBasis: physicalCashBasis.toFixed(2),
    cardElectronicTotal: cardElectronicTotal.toFixed(2),
    totalPaymentMethods: physicalCashBasis.plus(cardElectronicTotal).toFixed(2),
    manualDiscounts: discountsTotal.toFixed(2),
    cashDiscountTotal: hasCashDiscountConfigured ? cashDiscountTotal.toFixed(2) : null,
    electronicDiscountTotal: electronicDiscountTotal !== null ? electronicDiscountTotal.toFixed(2) : null,
    discountPosSourceId,
    discountPosSourceName: discountPosSource ? discountPosSource.name : null,
    cashByPosSource,
    expectedCash: expectedCash.toFixed(2),
    actualCashCounted: hasActualCashCounted ? actualCashCounted.toFixed(2) : null,
    discrepancy: discrepancy !== null ? discrepancy.toFixed(2) : null,
    status,
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
    actualCashCounted: row.actualCashCounted ? row.actualCashCounted.toFixed(2) : null,
    cashDiscountTotal: row.cashDiscountTotal ? row.cashDiscountTotal.toFixed(2) : null,
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
      posSourceId: entry.posSourceId,
      posSourceName: entry.posSource ? entry.posSource.name : null,
      amount: entry.amount.toFixed(2),
      transactionCount: entry.transactionCount,
      isCashEquivalent: entry.salesPaymentMethod.isCashEquivalent,
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
    cashReconciliation: computeCashReconciliation(
      row.paymentMethodEntries,
      row.discountsTotal,
      row.actualCashCounted,
      row.discountPosSourceId,
      row.discountPosSource,
      row.cashDiscountTotal
    ),
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
