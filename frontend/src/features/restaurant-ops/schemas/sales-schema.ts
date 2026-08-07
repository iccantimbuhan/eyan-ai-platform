import { z } from 'zod'

function nonNegativeNumericString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, { message })
}

function optionalNonNegativeNumericString(message: string) {
  return z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), { message })
}

export const salesSourceOptions = ['MANUAL', 'POS_REPORT'] as const
export const posReportTypeOptions = ['Z_REPORT', 'X_REPORT'] as const

// The header form — Date/POS Report/Total Sales/Discounts/Vouchers/Notes.
// Submitted first, on its own, to create the DailySalesRecord; the four
// line-entry sections below are added afterward against the created id.
export const dailySalesHeaderSchema = z.object({
  businessDate: z.date('A business date is required.'),
  source: z.enum(salesSourceOptions, 'A source is required.'),
  posReportType: z.enum(posReportTypeOptions).optional(),
  posReportNumber: z.string().trim().max(100).optional(),
  posReportedTotal: optionalNonNegativeNumericString('POS reported total must be zero or greater.'),
  totalSales: nonNegativeNumericString('Total sales must be zero or greater.'),
  discountsTotal: optionalNonNegativeNumericString('Discounts total must be zero or greater.'),
  vouchersAmount: optionalNonNegativeNumericString('Vouchers amount must be zero or greater.'),
  vouchersCount: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: 'Vouchers count must be a whole number, zero or greater.',
    }),
  notes: z.string().trim().max(1000).optional(),
})

export type DailySalesHeaderFormValues = z.infer<typeof dailySalesHeaderSchema>

export const defaultDailySalesHeaderValues: DailySalesHeaderFormValues = {
  businessDate: new Date(),
  source: 'MANUAL',
  posReportType: undefined,
  posReportNumber: '',
  posReportedTotal: '',
  totalSales: '',
  discountsTotal: '',
  vouchersAmount: '',
  vouchersCount: '',
  notes: '',
}

export const channelEntrySchema = z.object({
  salesChannelId: z.string().trim().min(1, 'Channel is required.'),
  amount: nonNegativeNumericString('Amount must be zero or greater.'),
})

export type ChannelEntryFormValues = z.infer<typeof channelEntrySchema>

export const defaultChannelEntryValues: ChannelEntryFormValues = { salesChannelId: '', amount: '' }

export const paymentMethodEntrySchema = z.object({
  salesPaymentMethodId: z.string().trim().min(1, 'Payment method is required.'),
  amount: nonNegativeNumericString('Amount must be zero or greater.'),
  transactionCount: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: 'Transaction count must be a whole number, zero or greater.',
    }),
})

export type PaymentMethodEntryFormValues = z.infer<typeof paymentMethodEntrySchema>

export const defaultPaymentMethodEntryValues: PaymentMethodEntryFormValues = {
  salesPaymentMethodId: '',
  amount: '',
  transactionCount: '',
}

export const categoryEntrySchema = z.object({
  salesCategoryId: z.string().trim().min(1, 'Category is required.'),
  quantity: optionalNonNegativeNumericString('Quantity must be zero or greater.'),
  amount: nonNegativeNumericString('Amount must be zero or greater.'),
})

export type CategoryEntryFormValues = z.infer<typeof categoryEntrySchema>

export const defaultCategoryEntryValues: CategoryEntryFormValues = {
  salesCategoryId: '',
  quantity: '',
  amount: '',
}

export const itemEntrySchema = z.object({
  menuItemId: z.string().trim().optional(),
  itemName: z.string().trim().min(1, 'Item name is required.'),
  categoryName: z.string().trim().max(100).optional(),
  quantity: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Quantity must be greater than 0.',
    }),
  amount: nonNegativeNumericString('Amount must be zero or greater.'),
})

export type ItemEntryFormValues = z.infer<typeof itemEntrySchema>

export const defaultItemEntryValues: ItemEntryFormValues = {
  menuItemId: '',
  itemName: '',
  categoryName: '',
  quantity: '',
  amount: '',
}
