import type { Expense } from "../generated/prisma/client.js";
import type { ExpenseResponseDto } from "./finance-expense.dto.js";

// Decimal -> string boundary conversion happens only here. .toFixed(2) is
// deliberate, not .toString() — decimal.js's toString() drops trailing
// zeros (e.g. "1900" instead of "1900.00"), which would be wrong for money.
export function mapExpenseToResponse(row: Expense): ExpenseResponseDto {
  return {
    id: row.id,
    date: row.date.toISOString(),
    amount: row.amount.toFixed(2),
    category: row.category,
    paymentMethod: row.paymentMethod,
    description: row.description,
    receiptPath: row.receiptPath,
    isRecurring: row.recurringTemplateId !== null,
    recurringTemplateId: row.recurringTemplateId,
    period: row.period,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
