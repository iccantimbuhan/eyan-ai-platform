import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
  ingredientCategoryId: z.string().optional(),
  supplierIds: z.array(z.string()).optional(),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>

export const defaultIngredientValues: IngredientFormValues = {
  name: '',
  ingredientCategoryId: '',
  supplierIds: [],
}
