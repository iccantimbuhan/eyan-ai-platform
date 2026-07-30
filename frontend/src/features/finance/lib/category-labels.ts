import type { ExpenseCategory, PaymentMethod } from '../types/finance'

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'HOUSING', label: 'Housing' },
  { value: 'FOOD', label: 'Food' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'TAX', label: 'Tax' },
  { value: 'OTHERS', label: 'Others' },
]

export function categoryLabel(category: ExpenseCategory): string {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  )
}

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
]

export function paymentMethodLabel(method: PaymentMethod | null): string {
  if (!method) return '—'
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    method
  )
}
