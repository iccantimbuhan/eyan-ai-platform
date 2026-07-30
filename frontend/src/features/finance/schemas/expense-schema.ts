import { z } from 'zod'

export const expenseCategories = [
  'HOUSING',
  'FOOD',
  'UTILITIES',
  'TRANSPORTATION',
  'SHOPPING',
  'MEDICAL',
  'CREDIT_CARD',
  'SAVINGS',
  'TAX',
  'OTHERS',
] as const

export const paymentMethods = [
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
] as const

// Only amount and category are truly required — everything else is
// optional so a single expense can be logged in under 30 seconds.
export const expenseSchema = z.object({
  date: z.date('A date is required.'),

  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Amount must be greater than 0.',
    }),

  category: z.enum(expenseCategories, 'Category is required.'),

  paymentMethod: z.enum(paymentMethods).optional(),

  description: z.string().trim().max(500, 'Notes cannot exceed 500 characters.').optional(),

  isRecurring: z.boolean().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const defaultExpenseValues: ExpenseFormValues = {
  date: new Date(),
  amount: '',
  category: 'OTHERS',
  paymentMethod: undefined,
  description: '',
  isRecurring: false,
}
