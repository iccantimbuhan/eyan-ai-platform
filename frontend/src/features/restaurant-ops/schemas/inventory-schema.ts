import { z } from 'zod'

function nonNegativeNumericString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, { message })
}

export const inventoryItemSchema = z.object({
  ingredientId: z.string().trim().min(1, 'Ingredient is required.'),
  unitId: z.string().trim().min(1, 'Unit is required.'),
  openingQuantity: nonNegativeNumericString('Opening quantity must be zero or greater.'),
  minimumQuantity: nonNegativeNumericString('Minimum quantity must be zero or greater.'),
})

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>

export const defaultInventoryItemValues: InventoryItemFormValues = {
  ingredientId: '',
  unitId: '',
  openingQuantity: '',
  minimumQuantity: '',
}

export const minimumQuantitySchema = z.object({
  minimumQuantity: nonNegativeNumericString('Minimum quantity must be zero or greater.'),
})

export type MinimumQuantityFormValues = z.infer<typeof minimumQuantitySchema>

export const adjustmentSchema = z.object({
  quantityDelta: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) !== 0, {
      message: 'Enter a non-zero amount — positive to increase stock, negative to decrease it.',
    }),
  reason: z.string().trim().min(1, 'A reason is required.'),
})

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

export const defaultAdjustmentValues: AdjustmentFormValues = {
  quantityDelta: '',
  reason: '',
}

export const wasteSchema = z.object({
  quantity: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Waste quantity must be greater than 0.',
    }),
  reason: z.string().trim().min(1, 'A reason is required.'),
})

export type WasteFormValues = z.infer<typeof wasteSchema>

export const defaultWasteValues: WasteFormValues = {
  quantity: '',
  reason: '',
}

export const stockCountSchema = z.object({
  countedQuantity: nonNegativeNumericString('Counted quantity must be zero or greater.'),
  reason: z.string().trim().optional(),
})

export type StockCountFormValues = z.infer<typeof stockCountSchema>

export const defaultStockCountValues: StockCountFormValues = {
  countedQuantity: '',
  reason: '',
}
