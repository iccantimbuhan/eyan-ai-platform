import type { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";

export interface CreateExpenseDto {
  date: string;
  amount: string;
  category: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  description?: string;

  // When set, a RecurringExpenseTemplate is created alongside this expense
  // so the same amount/category is generated again every month going
  // forward. See FinanceExpenseService.create().
  isRecurring?: boolean;
}

export interface UpdateExpenseDto {
  date?: string;
  amount?: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  description?: string;
}

export interface ListExpensesQueryDto {
  page?: number;
  pageSize?: number;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "date" | "amount" | "createdAt";
  sortDir?: "asc" | "desc";
}

export interface ExpenseResponseDto {
  id: string;
  date: string;
  amount: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod | null;
  description: string | null;
  receiptPath: string | null;
  isRecurring: boolean;
  recurringTemplateId: string | null;
  period: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
