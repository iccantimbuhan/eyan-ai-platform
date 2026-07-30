export type ExpenseCategory =
  | 'HOUSING'
  | 'FOOD'
  | 'UTILITIES'
  | 'TRANSPORTATION'
  | 'SHOPPING'
  | 'MEDICAL'
  | 'CREDIT_CARD'
  | 'SAVINGS'
  | 'TAX'
  | 'OTHERS'

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'OTHER'

export interface Expense {
  id: string
  date: string
  amount: string
  category: ExpenseCategory
  paymentMethod: PaymentMethod | null
  description: string | null
  receiptPath: string | null
  isRecurring: boolean
  recurringTemplateId: string | null
  period: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  period: string
  monthlyLimit: string
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryBreakdown {
  category: ExpenseCategory
  total: string
}

export interface SpendingTrendPoint {
  period: string
  total: string
}

export interface FinanceDashboard {
  period: string
  budget: Budget | null
  totalExpenses: string
  remainingBudget: string | null
  categoryBreakdown: CategoryBreakdown[]
  spendingTrend: SpendingTrendPoint[]
  recentExpenses: Expense[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
}
