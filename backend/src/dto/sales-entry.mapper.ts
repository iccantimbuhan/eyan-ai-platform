import type { Prisma } from "../generated/prisma/client.js";
import type {
  SalesCategoryEntryResponseDto,
  SalesChannelEntryResponseDto,
  SalesItemEntryResponseDto,
  SalesPaymentMethodEntryResponseDto,
} from "./daily-sales-record.dto.js";

type ChannelEntryRow = Prisma.SalesChannelEntryGetPayload<{ include: { salesChannel: true } }>;
type PaymentMethodEntryRow = Prisma.SalesPaymentMethodEntryGetPayload<{
  include: { salesPaymentMethod: true };
}>;
type CategoryEntryRow = Prisma.SalesCategoryEntryGetPayload<{ include: { salesCategory: true } }>;
type ItemEntryRow = Prisma.SalesItemEntryGetPayload<object>;

export function mapChannelEntryToResponse(row: ChannelEntryRow): SalesChannelEntryResponseDto {
  return {
    id: row.id,
    salesChannelId: row.salesChannelId,
    channelName: row.salesChannel.name,
    amount: row.amount.toFixed(2),
    createdAt: row.createdAt,
  };
}

export function mapPaymentMethodEntryToResponse(
  row: PaymentMethodEntryRow
): SalesPaymentMethodEntryResponseDto {
  return {
    id: row.id,
    salesPaymentMethodId: row.salesPaymentMethodId,
    paymentMethodName: row.salesPaymentMethod.name,
    amount: row.amount.toFixed(2),
    transactionCount: row.transactionCount,
    createdAt: row.createdAt,
  };
}

export function mapCategoryEntryToResponse(row: CategoryEntryRow): SalesCategoryEntryResponseDto {
  return {
    id: row.id,
    salesCategoryId: row.salesCategoryId,
    categoryName: row.salesCategory.name,
    quantity: row.quantity ? row.quantity.toFixed(2) : null,
    amount: row.amount.toFixed(2),
    createdAt: row.createdAt,
  };
}

export function mapItemEntryToResponse(row: ItemEntryRow): SalesItemEntryResponseDto {
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    itemName: row.itemName,
    categoryName: row.categoryName,
    quantity: row.quantity.toFixed(2),
    amount: row.amount.toFixed(2),
    createdAt: row.createdAt,
  };
}
