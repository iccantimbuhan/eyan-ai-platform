import { z } from 'zod'

export const recipeSchema = z.object({
  menuItemId: z.string().trim().min(1, 'Menu item is required.'),
  notes: z.string().trim().max(1000, 'Too long.').optional(),
})

export type RecipeFormValues = z.infer<typeof recipeSchema>

export const defaultRecipeValues: RecipeFormValues = {
  menuItemId: '',
  notes: '',
}

export const recipeIngredientLineSchema = z.object({
  ingredientId: z.string().trim().min(1, 'Ingredient is required.'),
  unitId: z.string().trim().min(1, 'Unit is required.'),
  quantity: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Quantity must be greater than 0.',
    }),
})

export type RecipeIngredientLineFormValues = z.infer<typeof recipeIngredientLineSchema>

export const defaultRecipeIngredientLineValues: RecipeIngredientLineFormValues = {
  ingredientId: '',
  unitId: '',
  quantity: '',
}
