import { api } from '@/services/api'
import type {
  ApiResponse,
  Budget,
  Expense,
  ExpenseCategory,
  FinanceDashboard,
  PaginatedResponse,
  PaymentMethod,
} from '../types/finance'

export async function getDashboard(period?: string): Promise<FinanceDashboard> {
  const { data } = await api.get<ApiResponse<FinanceDashboard>>('/finance/dashboard', {
    params: period ? { period } : undefined,
  })
  return data.data
}

export interface ListExpensesParams {
  page?: number
  pageSize?: number
  category?: ExpenseCategory
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function getExpenses(
  params: ListExpensesParams = {}
): Promise<PaginatedResponse<Expense>> {
  const { data } = await api.get<PaginatedResponse<Expense>>('/finance/expenses', {
    // Backend caps pageSize at 100 (utils/pagination.ts) — the Expenses
    // table paginates client-side on top of this page (TanStack Table),
    // matching the "users" feature's fetch-a-page/paginate-client-side
    // convention rather than fully server-driven pagination.
    params: { pageSize: 100, ...params },
  })
  return data
}

export interface ExpensePayload {
  date: string
  amount: string
  category: ExpenseCategory
  paymentMethod?: PaymentMethod
  description?: string
  isRecurring?: boolean
}

export async function createExpense(payload: ExpensePayload) {
  const { data } = await api.post('/finance/expenses', payload)
  return data
}

export async function updateExpense(
  id: string,
  payload: Partial<Omit<ExpensePayload, 'isRecurring'>>
) {
  const { data } = await api.patch(`/finance/expenses/${id}`, payload)
  return data
}

export async function deleteExpense(id: string) {
  const { data } = await api.delete(`/finance/expenses/${id}`)
  return data
}

export async function getBudget(period?: string): Promise<Budget> {
  const { data } = await api.get<ApiResponse<Budget>>('/finance/budget', {
    params: period ? { period } : undefined,
  })
  return data.data
}

export async function setBudget(payload: {
  period: string
  monthlyLimit: string
}): Promise<Budget> {
  const { data } = await api.put<ApiResponse<Budget>>('/finance/budget', payload)
  return data.data
}
