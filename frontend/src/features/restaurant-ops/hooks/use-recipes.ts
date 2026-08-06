import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createRecipe,
  createRecipeIngredient,
  deleteRecipe,
  deleteRecipeIngredient,
  getRecipes,
  updateRecipe,
  updateRecipeIngredient,
  type RecipeIngredientPayload,
} from '../api/restaurant-ops-api'

export function useRecipes(restaurantId: string) {
  return useQuery({
    queryKey: ['recipes', restaurantId],
    queryFn: () => getRecipes(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateRecipe(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { menuItemId: string; notes?: string | null }) =>
      createRecipe(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Recipe added.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to add recipe.')
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { notes?: string | null } }) =>
      updateRecipe(id, payload),

    onSuccess: async () => {
      toast.success('Recipe updated.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to update recipe.')
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),

    onSuccess: async () => {
      toast.success('Recipe deleted.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to delete recipe.')
    },
  })
}

export function useCreateRecipeIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipeId, payload }: { recipeId: string; payload: RecipeIngredientPayload }) =>
      createRecipeIngredient(recipeId, payload),

    onSuccess: async () => {
      toast.success('Ingredient added to recipe.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to add ingredient to recipe.')
    },
  })
}

export function useUpdateRecipeIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<RecipeIngredientPayload>
    }) => updateRecipeIngredient(id, payload),

    onSuccess: async () => {
      toast.success('Recipe line updated.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to update recipe line.')
    },
  })
}

export function useDeleteRecipeIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRecipeIngredient(id),

    onSuccess: async () => {
      toast.success('Ingredient removed from recipe.')
      await queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },

    onError: () => {
      toast.error('Failed to remove ingredient from recipe.')
    },
  })
}
