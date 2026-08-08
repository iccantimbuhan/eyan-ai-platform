import type { PosReportType, SalesSource } from "../generated/prisma/enums.js";
import type { CashReconciliationDto, SalesReconciliationDto } from "./sales-aggregation.dto.js";

export interface CreateDailySalesRecordDto {
  businessDate: string; // "YYYY-MM-DD"
  source: SalesSource;
  posReportType?: PosReportType;
  posReportNumber?: string;
  posReportedTotal?: number | string;
  totalSales: number | string;
  discountsTotal?: number | string;
  vouchersAmount?: number | string;
  vouchersCount?: number;
  // Manager-entered physical cash count for the whole day (ADR-0043).
  // Optional — most records won't have one at creation time.
  actualCashCounted?: number | string;
  notes?: string;
}

export interface UpdateDailySalesRecordDto {
  source?: SalesSource;
  posReportType?: PosReportType | null;
  posReportNumber?: string | null;
  posReportedTotal?: number | string | null;
  totalSales?: number | string;
  discountsTotal?: number | string;
  vouchersAmount?: number | string;
  vouchersCount?: number | null;
  actualCashCounted?: number | string | null;
  notes?: string | null;
}

export interface SalesChannelEntryResponseDto {
  id: string;
  salesChannelId: string;
  channelName: string;
  // POS Source / Sales Channel Flexibility — optional, which POS terminal
  // reported this line. null when not specified (the common single-POS
  // case) or the assigned POS source was later deleted.
  posSourceId: string | null;
  posSourceName: string | null;
  amount: string;
  transactionCount: number | null;
  createdAt: Date;
}

export interface SalesPaymentMethodEntryResponseDto {
  id: string;
  salesPaymentMethodId: string;
  paymentMethodName: string;
  // POS Source / Sales Channel Flexibility — mirrors
  // SalesChannelEntryResponseDto.posSourceId/posSourceName exactly.
  posSourceId: string | null;
  posSourceName: string | null;
  amount: string;
  transactionCount: number | null;
  // Catalog-level cash classification (ADR-0043), read off the referenced
  // SalesPaymentMethod at response time — lets the UI split a record's
  // payment methods into Physical Cash vs Card/Electronic without a
  // second lookup.
  isCashEquivalent: boolean;
  createdAt: Date;
}

export interface SalesCategoryEntryResponseDto {
  id: string;
  salesCategoryId: string;
  categoryName: string;
  quantity: string | null;
  amount: string;
  createdAt: Date;
}

export interface SalesItemEntryResponseDto {
  id: string;
  menuItemId: string | null;
  itemName: string;
  categoryName: string | null;
  quantity: string;
  amount: string;
  // POS-reported %QT/%SALE — transcribed as printed on the POS X/Z report,
  // never confused with Sprint 2D's own computed analytics percentages.
  // null when this entry wasn't sourced from a POS report.
  posQuantityPercent: string | null;
  posSalesPercent: string | null;
  createdAt: Date;
}

export interface DailySalesRecordResponseDto {
  id: string;
  branchId: string;
  restaurantId: string;
  businessDate: string; // "YYYY-MM-DD"
  source: SalesSource;
  posReportType: PosReportType | null;
  posReportNumber: string | null;
  posReportedTotal: string | null;
  totalSales: string;
  discountsTotal: string;
  vouchersAmount: string;
  vouchersCount: number | null;
  // Manager-entered physical cash count for the whole day (ADR-0043). Null
  // until entered — never inferred from POS data.
  actualCashCounted: string | null;
  notes: string | null;
  channels: SalesChannelEntryResponseDto[];
  paymentMethods: SalesPaymentMethodEntryResponseDto[];
  categories: SalesCategoryEntryResponseDto[];
  items: SalesItemEntryResponseDto[];
  // Sprint 2D (Reporting Foundation) — the same reconciliation shape the
  // weekly summary uses, computed for this single day. Never mutates the
  // record; a non-zero variance is not automatically an error (spec §F).
  reconciliation: SalesReconciliationDto;
  // ADR-0043 — a separate calculation from reconciliation above; never
  // touches totalSales, only payment-method entries/discountsTotal/
  // actualCashCounted. Computed fresh on every read, never persisted.
  cashReconciliation: CashReconciliationDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailySalesRecordListItemDto {
  id: string;
  branchId: string;
  businessDate: string;
  source: SalesSource;
  totalSales: string;
  createdAt: Date;
}
