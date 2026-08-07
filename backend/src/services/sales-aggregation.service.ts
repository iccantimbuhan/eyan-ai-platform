import {
  dailySalesRecordRepository,
  DailySalesRecordRepository,
} from "../repositories/daily-sales-record.repository.js";
import { truncateToUtcDate } from "./daily-sales-record.service.js";
import { formatBusinessDate } from "../dto/daily-sales-record.mapper.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
  CategoryTotalDto,
  ChannelTotalDto,
  DailySalesTotalDto,
  PaymentMethodTotalDto,
  PosSourceChannelBreakdownDto,
  PosSourceTotalDto,
  SalesComparisonDto,
  SalesComparisonEntryDto,
  SalesDataCoverageDto,
  SalesReconciliationDto,
  TopItemDto,
  WeeklySalesSummaryDto,
} from "../dto/sales-aggregation.dto.js";

// Key for the "no POS source specified" bucket — always present in
// posSourceTotals/channelsByPosSource (even when empty-of-entries it's
// simply omitted, never a phantom zero row), so single-POS restaurants that
// never set posSourceId still see their full channelEntriesTotal reflected
// somewhere. Distinct from any real PosSource id (cuid), so it can never
// collide with one.
const UNASSIGNED_POS_SOURCE_KEY = "unassigned";

const TOP_ITEMS_LIMIT = 10;

function percentOfBasis(part: Prisma.Decimal, basis: Prisma.Decimal): string | null {
  if (basis.isZero()) return null;
  return part.dividedBy(basis).times(100).toFixed(1);
}

function averageOrNull(total: Prisma.Decimal, count: number): string | null {
  if (count === 0) return null;
  return total.dividedBy(count).toFixed(2);
}

// Every calendar date in [start, end] inclusive, as "YYYY-MM-DD" strings —
// used only to find which days in the range have NO DailySalesRecord.
// Missing days are never treated as zero (spec §G).
function enumerateDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatBusinessDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function compareMetric(currentStr: string, previousStr: string, key: string, label: string): SalesComparisonEntryDto {
  const current = new Prisma.Decimal(currentStr);
  const previous = new Prisma.Decimal(previousStr);
  const change = current.minus(previous);
  const changePercent = previous.isZero() ? null : change.dividedBy(previous).times(100).toFixed(1);
  return {
    key,
    label,
    current: current.toFixed(2),
    previous: previous.toFixed(2),
    change: change.toFixed(2),
    changePercent,
  };
}

// Unions the current/previous breakdown lists by key so a channel/category/
// item present in only one period still gets a comparison row (its missing
// side is a real "0", not a data gap — unlike a missing calendar day).
function compareEntries<T>(
  currentList: T[],
  previousList: T[],
  getKey: (entry: T) => string,
  getLabel: (entry: T) => string,
  getAmount: (entry: T) => string
): SalesComparisonEntryDto[] {
  const merged = new Map<string, { label: string; current: string; previous: string }>();

  for (const entry of currentList) {
    merged.set(getKey(entry), { label: getLabel(entry), current: getAmount(entry), previous: "0.00" });
  }
  for (const entry of previousList) {
    const key = getKey(entry);
    const existing = merged.get(key);
    if (existing) {
      existing.previous = getAmount(entry);
    } else {
      merged.set(key, { label: getLabel(entry), current: "0.00", previous: getAmount(entry) });
    }
  }

  return Array.from(merged.entries())
    .map(([key, value]) => compareMetric(value.current, value.previous, key, value.label))
    .sort((a, b) => new Prisma.Decimal(b.current).comparedTo(new Prisma.Decimal(a.current)));
}

// Pure computation over already-fetched DailySalesRecord rows — no raw SQL
// aggregation, no new query infrastructure. Every returned total is
// calculated fresh from RAW INPUT rows on each request, never stored (spec
// §13). Realistic weekly row counts (a handful of records, each with a
// handful of lines) make in-memory Decimal summation the right level of
// complexity here, not a BI engine.
export class SalesAggregationService {
  constructor(private readonly repository: DailySalesRecordRepository = dailySalesRecordRepository) {}

  async getWeeklySummary(
    branchId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklySalesSummaryDto> {
    const start = truncateToUtcDate(startDate);
    const end = truncateToUtcDate(endDate);

    const records = await this.repository.findManyByBranchIdAndDateRange(branchId, start, end);

    let totalSales = new Prisma.Decimal(0);
    let discountsTotal = new Prisma.Decimal(0);
    let vouchersAmount = new Prisma.Decimal(0);
    let vouchersCount = 0;
    let posReportedTotal = new Prisma.Decimal(0);
    let posReportedRecordCount = 0;

    const dailySales: DailySalesTotalDto[] = [];

    const channelTotals = new Map<
      string,
      { channelName: string; amount: Prisma.Decimal; activeDays: number }
    >();
    const posSourceTotals = new Map<
      string,
      { posSourceId: string | null; posSourceName: string | null; amount: Prisma.Decimal; transactionCount: number }
    >();
    // Nested: POS source bucket key -> its own channelId -> amount/activeDays,
    // the same shape channelTotals uses one level up. Answers "sales by POS
    // + channel combination" without assuming a channel belongs to one POS.
    const channelsByPosSourceTotals = new Map<
      string,
      {
        posSourceId: string | null;
        posSourceName: string | null;
        channels: Map<string, { channelName: string; amount: Prisma.Decimal; activeDays: number }>;
      }
    >();
    const paymentMethodTotals = new Map<
      string,
      { paymentMethodName: string; amount: Prisma.Decimal; transactionCount: number }
    >();
    const categoryTotals = new Map<
      string,
      { categoryName: string; quantity: Prisma.Decimal | null; amount: Prisma.Decimal }
    >();
    const itemTotals = new Map<string, { itemName: string; quantity: Prisma.Decimal; amount: Prisma.Decimal }>();

    for (const record of records) {
      totalSales = totalSales.plus(record.totalSales);
      discountsTotal = discountsTotal.plus(record.discountsTotal);
      vouchersAmount = vouchersAmount.plus(record.vouchersAmount);
      vouchersCount += record.vouchersCount ?? 0;

      if (record.posReportedTotal) {
        posReportedTotal = posReportedTotal.plus(record.posReportedTotal);
        posReportedRecordCount += 1;
      }

      const dayChannelTotal = record.channelEntries.reduce(
        (sum: Prisma.Decimal, entry: (typeof record.channelEntries)[number]) => sum.plus(entry.amount),
        new Prisma.Decimal(0)
      );

      dailySales.push({
        date: formatBusinessDate(record.businessDate),
        totalSales: record.totalSales.toFixed(2),
        posReportedTotal: record.posReportedTotal ? record.posReportedTotal.toFixed(2) : null,
        channelEntriesTotal: dayChannelTotal.toFixed(2),
      });

      for (const entry of record.channelEntries) {
        const existing = channelTotals.get(entry.salesChannelId);
        if (existing) {
          existing.amount = existing.amount.plus(entry.amount);
          existing.activeDays += 1;
        } else {
          channelTotals.set(entry.salesChannelId, {
            channelName: entry.salesChannel.name,
            amount: new Prisma.Decimal(entry.amount),
            activeDays: 1,
          });
        }

        const posSourceKey = entry.posSourceId ?? UNASSIGNED_POS_SOURCE_KEY;
        const posSourceName = entry.posSource ? entry.posSource.name : null;

        const existingPosSource = posSourceTotals.get(posSourceKey);
        if (existingPosSource) {
          existingPosSource.amount = existingPosSource.amount.plus(entry.amount);
          existingPosSource.transactionCount += entry.transactionCount ?? 0;
        } else {
          posSourceTotals.set(posSourceKey, {
            posSourceId: entry.posSourceId,
            posSourceName,
            amount: new Prisma.Decimal(entry.amount),
            transactionCount: entry.transactionCount ?? 0,
          });
        }

        let posSourceBucket = channelsByPosSourceTotals.get(posSourceKey);
        if (!posSourceBucket) {
          posSourceBucket = { posSourceId: entry.posSourceId, posSourceName, channels: new Map() };
          channelsByPosSourceTotals.set(posSourceKey, posSourceBucket);
        }
        const existingBucketChannel = posSourceBucket.channels.get(entry.salesChannelId);
        if (existingBucketChannel) {
          existingBucketChannel.amount = existingBucketChannel.amount.plus(entry.amount);
          existingBucketChannel.activeDays += 1;
        } else {
          posSourceBucket.channels.set(entry.salesChannelId, {
            channelName: entry.salesChannel.name,
            amount: new Prisma.Decimal(entry.amount),
            activeDays: 1,
          });
        }
      }

      for (const entry of record.paymentMethodEntries) {
        const existing = paymentMethodTotals.get(entry.salesPaymentMethodId);
        if (existing) {
          existing.amount = existing.amount.plus(entry.amount);
          existing.transactionCount += entry.transactionCount ?? 0;
        } else {
          paymentMethodTotals.set(entry.salesPaymentMethodId, {
            paymentMethodName: entry.salesPaymentMethod.name,
            amount: new Prisma.Decimal(entry.amount),
            transactionCount: entry.transactionCount ?? 0,
          });
        }
      }

      for (const entry of record.categoryEntries) {
        const existing = categoryTotals.get(entry.salesCategoryId);
        if (existing) {
          existing.amount = existing.amount.plus(entry.amount);
          existing.quantity = entry.quantity
            ? (existing.quantity ?? new Prisma.Decimal(0)).plus(entry.quantity)
            : existing.quantity;
        } else {
          categoryTotals.set(entry.salesCategoryId, {
            categoryName: entry.salesCategory.name,
            quantity: entry.quantity ? new Prisma.Decimal(entry.quantity) : null,
            amount: new Prisma.Decimal(entry.amount),
          });
        }
      }

      // Groups by menuItemId when linked, otherwise by the raw itemName —
      // two days both entering "Margherita" by hand (no MenuItem selected
      // either time) still total together sensibly.
      for (const item of record.itemEntries) {
        const key = item.menuItemId ?? `name:${item.itemName}`;
        const existing = itemTotals.get(key);
        if (existing) {
          existing.quantity = existing.quantity.plus(item.quantity);
          existing.amount = existing.amount.plus(item.amount);
        } else {
          itemTotals.set(key, {
            itemName: item.itemName,
            quantity: new Prisma.Decimal(item.quantity),
            amount: new Prisma.Decimal(item.amount),
          });
        }
      }
    }

    const channelEntriesTotal = Array.from(channelTotals.values()).reduce(
      (sum, v) => sum.plus(v.amount),
      new Prisma.Decimal(0)
    );
    const paymentMethodEntriesTotal = Array.from(paymentMethodTotals.values()).reduce(
      (sum, v) => sum.plus(v.amount),
      new Prisma.Decimal(0)
    );
    const categoryEntriesTotal = Array.from(categoryTotals.values()).reduce(
      (sum, v) => sum.plus(v.amount),
      new Prisma.Decimal(0)
    );

    const topItems: TopItemDto[] = Array.from(itemTotals.entries())
      .sort(([, a], [, b]) => b.amount.comparedTo(a.amount))
      .slice(0, TOP_ITEMS_LIMIT)
      .map(([key, value]) => ({
        key,
        itemName: value.itemName,
        quantity: value.quantity.toFixed(2),
        amount: value.amount.toFixed(2),
      }));

    const channelTotalsDto: ChannelTotalDto[] = Array.from(channelTotals.entries()).map(
      ([salesChannelId, value]) => ({
        salesChannelId,
        channelName: value.channelName,
        amount: value.amount.toFixed(2),
        percentOfChannelEntriesTotal: percentOfBasis(value.amount, channelEntriesTotal),
        activeDays: value.activeDays,
        averageAmountPerActiveDay: averageOrNull(value.amount, value.activeDays),
      })
    );

    const posSourceTotalsDto: PosSourceTotalDto[] = Array.from(posSourceTotals.values()).map((value) => ({
      posSourceId: value.posSourceId,
      posSourceName: value.posSourceName,
      amount: value.amount.toFixed(2),
      transactionCount: value.transactionCount,
      percentOfChannelEntriesTotal: percentOfBasis(value.amount, channelEntriesTotal),
    }));

    const channelsByPosSourceDto: PosSourceChannelBreakdownDto[] = Array.from(
      channelsByPosSourceTotals.values()
    ).map((bucket) => ({
      posSourceId: bucket.posSourceId,
      posSourceName: bucket.posSourceName,
      channels: Array.from(bucket.channels.entries()).map(([salesChannelId, value]) => ({
        salesChannelId,
        channelName: value.channelName,
        amount: value.amount.toFixed(2),
        percentOfChannelEntriesTotal: percentOfBasis(value.amount, channelEntriesTotal),
        activeDays: value.activeDays,
        averageAmountPerActiveDay: averageOrNull(value.amount, value.activeDays),
      })),
    }));

    const paymentMethodTotalsDto: PaymentMethodTotalDto[] = Array.from(paymentMethodTotals.entries()).map(
      ([salesPaymentMethodId, value]) => ({
        salesPaymentMethodId,
        paymentMethodName: value.paymentMethodName,
        amount: value.amount.toFixed(2),
        transactionCount: value.transactionCount,
        percentOfPaymentMethodEntriesTotal: percentOfBasis(value.amount, paymentMethodEntriesTotal),
      })
    );

    const categoryTotalsDto: CategoryTotalDto[] = Array.from(categoryTotals.entries()).map(
      ([salesCategoryId, value]) => ({
        salesCategoryId,
        categoryName: value.categoryName,
        quantity: value.quantity ? value.quantity.toFixed(2) : null,
        amount: value.amount.toFixed(2),
        percentOfCategoryEntriesTotal: percentOfBasis(value.amount, categoryEntriesTotal),
      })
    );

    const allDatesInRange = enumerateDates(start, end);
    const recordedDates = new Set(dailySales.map((d) => d.date));
    const missingDates = allDatesInRange.filter((date) => !recordedDates.has(date));

    const coverage: SalesDataCoverageDto = {
      daysInRange: allDatesInRange.length,
      daysRecorded: records.length,
      missingDays: missingDates.length,
      missingDates,
      averageSalesPerRecordedDay: averageOrNull(totalSales, records.length),
    };

    const reconciliation: SalesReconciliationDto = {
      totalSales: totalSales.toFixed(2),
      posReportedTotal: posReportedRecordCount > 0 ? posReportedTotal.toFixed(2) : null,
      posReportedRecordCount,
      channelEntriesTotal: channelEntriesTotal.toFixed(2),
      varianceVsPosReportedTotal:
        posReportedRecordCount > 0 ? totalSales.minus(posReportedTotal).toFixed(2) : null,
      varianceVsChannelEntriesTotal: totalSales.minus(channelEntriesTotal).toFixed(2),
    };

    return {
      branchId,
      startDate: formatBusinessDate(start),
      endDate: formatBusinessDate(end),
      totalSales: totalSales.toFixed(2),
      discountsTotal: discountsTotal.toFixed(2),
      vouchersAmount: vouchersAmount.toFixed(2),
      vouchersCount,
      coverage,
      reconciliation,
      dailySales,
      channelTotals: channelTotalsDto,
      posSourceTotals: posSourceTotalsDto,
      channelsByPosSource: channelsByPosSourceDto,
      paymentMethodTotals: paymentMethodTotalsDto,
      categoryTotals: categoryTotalsDto,
      topItems,
    };
  }

  // The two periods are both supplied explicitly by the caller
  // (startDate/endDate for each) — this method never infers "the previous
  // period" from the current one, per the user's explicit instruction.
  async getComparison(
    branchId: string,
    currentStartDate: string,
    currentEndDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<SalesComparisonDto> {
    const [current, previous] = await Promise.all([
      this.getWeeklySummary(branchId, currentStartDate, currentEndDate),
      this.getWeeklySummary(branchId, previousStartDate, previousEndDate),
    ]);

    const totalSalesComparison = compareMetric(current.totalSales, previous.totalSales, "totalSales", "Total Sales");

    const channelComparison = compareEntries(
      current.channelTotals,
      previous.channelTotals,
      (e) => e.salesChannelId,
      (e) => e.channelName,
      (e) => e.amount
    );

    const categoryComparison = compareEntries(
      current.categoryTotals,
      previous.categoryTotals,
      (e) => e.salesCategoryId,
      (e) => e.categoryName,
      (e) => e.amount
    );

    const topItemsComparison = compareEntries(
      current.topItems,
      previous.topItems,
      (e) => e.key,
      (e) => e.itemName,
      (e) => e.amount
    );

    return {
      branchId,
      current,
      previous,
      totalSalesComparison,
      channelComparison,
      categoryComparison,
      topItemsComparison,
    };
  }
}

export const salesAggregationService = new SalesAggregationService();
