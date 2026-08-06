import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createIngredientCategory,
  deleteIngredientCategory,
  getIngredientCategories,
  updateIngredientCategory,
} from '../api/restaurant-ops-api'

function invalidateIngredientCategoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ingredient-categories'] }),
    queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  ])
}

export function useIngredientCategories(restaurantId: string) {
  return useQuery({
    queryKey: ['ingredient-categories', restaurantId],
    queryFn: () => getIngredientCategories(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateIngredientCategory(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string }) => createIngredientCategory(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Ingredient category added.')
      await invalidateIngredientCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add ingredient category.')
    },
  })
}

export function useUpdateIngredientCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string } }) =>
      updateIngredientCategory(id, payload),

    onSuccess: async () => {
      toast.success('Ingredient category updated.')
      await invalidateIngredientCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update ingredient category.')
    },
  })
}

export function useDeleteIngredientCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteIngredientCategory(id),

    onSuccess: async () => {
      toast.success('Ingredient category deleted.')
      await invalidateIngredientCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete ingredient category.')
    },
  })
}
