export interface DailySalesTotalDto {
  date: string; // "YYYY-MM-DD"
  totalSales: string;
  // Independent figures shown alongside totalSales — never assumed to
  // reconcile with it (ADR-0039 Decision 2/3; see reconciliation below).
  posReportedTotal: string | null;
  channelEntriesTotal: string;
}

// Every breakdown percentage is a share of that breakdown's OWN recorded
// total (e.g. a channel's share of Sigma channel entries), never a share of
// totalSales/posReportedTotal — those are independent figures that are not
// guaranteed to reconcile (ADR-0039 Decision 2). null when the breakdown's
// own total is zero (division by zero).
export interface ChannelTotalDto {
  salesChannelId: string;
  channelName: string;
  amount: string;
  percentOfChannelEntriesTotal: string | null;
  activeDays: number;
  averageAmountPerActiveDay: string | null;
}

// POS Source / Sales Channel Flexibility — sales by POS terminal, grouped
// the same way ChannelTotalDto groups by channel. posSourceId/posSourceName
// are both null for the "unassigned" bucket (entries where the manager
// didn't specify a POS source — the common single-POS case), which is
// always included, never dropped, so totals still add up to
// channelEntriesTotal.
export interface PosSourceTotalDto {
  posSourceId: string | null;
  posSourceName: string | null;
  amount: string;
  transactionCount: number;
  percentOfChannelEntriesTotal: string | null;
}

// Answers "sales by POS + channel combination" (one row per POS source,
// each carrying its own channel breakdown) without assuming every channel
// belongs to exactly one POS — a channel can appear under multiple POS
// source buckets across different entries.
export interface PosSourceChannelBreakdownDto {
  posSourceId: string | null;
  posSourceName: string | null;
  channels: ChannelTotalDto[];
}

export interface PaymentMethodTotalDto {
  salesPaymentMethodId: string;
  paymentMethodName: string;
  amount: string;
  transactionCount: number;
  percentOfPaymentMethodEntriesTotal: string | null;
}

// POS Source / Sales Channel Flexibility, extended to Payment Methods —
// sales by POS terminal for the payment-method dimension, same shape as
// PosSourceTotalDto. Deliberately a SEPARATE figure from PosSourceTotalDto
// (channels) — a POS's channel total and its payment-method total are
// independent facts about that POS, never summed together, mirroring
// ADR-0039 Decision 2's channel-vs-payment-method separation at the
// whole-day level.
export interface PaymentMethodPosSourceTotalDto {
  posSourceId: string | null;
  posSourceName: string | null;
  amount: string;
  transactionCount: number;
  percentOfPaymentMethodEntriesTotal: string | null;
}

// Answers "sales by POS + payment method combination" — one row per POS
// source (including the unassigned bucket), each with its own
// payment-method breakdown. Mirrors PosSourceChannelBreakdownDto.
export interface PosSourcePaymentMethodBreakdownDto {
  posSourceId: string | null;
  posSourceName: string | null;
  paymentMethods: PaymentMethodTotalDto[];
}

export interface CategoryTotalDto {
  salesCategoryId: string;
  categoryName: string;
  quantity: string | null;
  amount: string;
  percentOfCategoryEntriesTotal: string | null;
}

// key is menuItemId when the line references one, otherwise the itemName
// itself — items entered under the same name without a MenuItem link still
// group together sensibly (e.g. two days both entering "Margherita" by
// hand, no MenuItem selected either time).
export interface TopItemDto {
  key: string;
  itemName: string;
  quantity: string;
  amount: string;
}

// Days in the requested range with no DailySalesRecord at all — distinct
// from a recorded day with €0 sales. Never treated as zero anywhere in this
// service (spec §G).
export interface SalesDataCoverageDto {
  daysInRange: number;
  daysRecorded: number;
  missingDays: number;
  missingDates: string[]; // "YYYY-MM-DD", ascending
  averageSalesPerRecordedDay: string | null; // null when daysRecorded === 0
}

// Surfaces the gap between independently-entered figures without ever
// mutating the underlying records or silently "fixing" a mismatch (spec §F,
// ADR-0039 Decision 2/3). A non-zero variance is not automatically an
// error — the UI must label it neutrally ("recorded difference — requires
// review"), not as a fault.
export interface SalesReconciliationDto {
  totalSales: string;
  posReportedTotal: string | null; // sum of records that had one; null if none did
  posReportedRecordCount: number;
  channelEntriesTotal: string;
  varianceVsPosReportedTotal: string | null; // totalSales - posReportedTotal; null if posReportedTotal is null
  varianceVsChannelEntriesTotal: string; // totalSales - channelEntriesTotal
}

// A calculated summary — every field here is derived on read from
// DailySalesRecord/entry rows in the given range, never persisted (spec
// §13: RAW INPUT vs CALCULATED SUMMARY).
export interface WeeklySalesSummaryDto {
  branchId: string;
  startDate: string;
  endDate: string;
  totalSales: string;
  discountsTotal: string;
  vouchersAmount: string;
  vouchersCount: number;
  coverage: SalesDataCoverageDto;
  reconciliation: SalesReconciliationDto;
  dailySales: DailySalesTotalDto[];
  channelTotals: ChannelTotalDto[];
  posSourceTotals: PosSourceTotalDto[];
  channelsByPosSource: PosSourceChannelBreakdownDto[];
  paymentMethodTotals: PaymentMethodTotalDto[];
  paymentMethodPosSourceTotals: PaymentMethodPosSourceTotalDto[];
  paymentMethodsByPosSource: PosSourcePaymentMethodBreakdownDto[];
  categoryTotals: CategoryTotalDto[];
  topItems: TopItemDto[];
}

// One comparable metric or breakdown row between two explicit,
// caller-supplied date ranges. changePercent is null (not a computed
// infinity/NaN) when the previous period's value is zero — "no comparison
// data" is a distinct state from "0% change" (spec §C).
export interface SalesComparisonEntryDto {
  key: string;
  label: string;
  current: string;
  previous: string;
  change: string;
  changePercent: string | null;
}

// Reuses getWeeklySummary() for both ranges — the two periods are supplied
// explicitly by the caller (startDate/endDate for each) and never inferred
// by the backend (e.g. no "previous = 7 days before current" guessing).
export interface SalesComparisonDto {
  branchId: string;
  current: WeeklySalesSummaryDto;
  previous: WeeklySalesSummaryDto;
  totalSalesComparison: SalesComparisonEntryDto;
  channelComparison: SalesComparisonEntryDto[];
  categoryComparison: SalesComparisonEntryDto[];
  topItemsComparison: SalesComparisonEntryDto[];
}
