import type { PosReportType, SalesSource } from "../generated/prisma/enums.js";
import type { SalesReconciliationDto } from "./sales-aggregation.dto.js";

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
  notes?: string | null;
}

export interface SalesChannelEntryResponseDto {
  id: string;
  salesChannelId: string;
  channelName: string;
  amount: string;
  createdAt: Date;
}

export interface SalesPaymentMethodEntryResponseDto {
  id: string;
  salesPaymentMethodId: string;
  paymentMethodName: string;
  amount: string;
  transactionCount: number | null;
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
  notes: string | null;
  channels: SalesChannelEntryResponseDto[];
  paymentMethods: SalesPaymentMethodEntryResponseDto[];
  categories: SalesCategoryEntryResponseDto[];
  items: SalesItemEntryResponseDto[];
  // Sprint 2D (Reporting Foundation) — the same reconciliation shape the
  // weekly summary uses, computed for this single day. Never mutates the
  // record; a non-zero variance is not automatically an error (spec §F).
  reconciliation: SalesReconciliationDto;
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
