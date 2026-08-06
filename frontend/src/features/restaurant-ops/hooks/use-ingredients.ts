import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createIngredient,
  deleteIngredient,
  getIngredients,
  updateIngredient,
  type IngredientPayload,
} from '../api/restaurant-ops-api'

export function useIngredients(restaurantId: string) {
  return useQuery({
    queryKey: ['ingredients', restaurantId],
    queryFn: () => getIngredients(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateIngredient(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IngredientPayload) => createIngredient(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Ingredient added.')
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },

    onError: () => {
      toast.error('Failed to add ingredient.')
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<IngredientPayload> }) =>
      updateIngredient(id, payload),

    onSuccess: async () => {
      toast.success('Ingredient updated.')
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },

    onError: () => {
      toast.error('Failed to update ingredient.')
    },
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),

    onSuccess: async () => {
      toast.success('Ingredient deleted.')
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },

    onError: () => {
      toast.error('Failed to delete ingredient.')
    },
  })
}
