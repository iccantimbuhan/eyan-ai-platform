import { z } from 'zod'

export const ingredientCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
})

export type IngredientCategoryFormValues = z.infer<typeof ingredientCategorySchema>

export const defaultIngredientCategoryValues: IngredientCategoryFormValues = {
  name: '',
}
