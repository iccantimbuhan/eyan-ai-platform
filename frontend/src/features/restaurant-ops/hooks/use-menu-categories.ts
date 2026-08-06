import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuCategories,
  updateMenuCategory,
} from '../api/restaurant-ops-api'

function invalidateMenuCategoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['menu-categories'] }),
    queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
  ])
}

export function useMenuCategories(restaurantId: string) {
  return useQuery({
    queryKey: ['menu-categories', restaurantId],
    queryFn: () => getMenuCategories(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateMenuCategory(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; displayOrder?: number }) =>
      createMenuCategory(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Menu category added.')
      await invalidateMenuCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add menu category.')
    },
  })
}

export function useUpdateMenuCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { name?: string; displayOrder?: number }
    }) => updateMenuCategory(id, payload),

    onSuccess: async () => {
      toast.success('Menu category updated.')
      await invalidateMenuCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update menu category.')
    },
  })
}

export function useDeleteMenuCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteMenuCategory(id),

    onSuccess: async () => {
      toast.success('Menu category deleted.')
      await invalidateMenuCategoryQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete menu category.')
    },
  })
}
