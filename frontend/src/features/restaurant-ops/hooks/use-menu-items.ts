import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  updateMenuItem,
  type MenuItemPayload,
} from '../api/restaurant-ops-api'

function invalidateMenuItemQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['menu-items'] })
}

export function useMenuItems(restaurantId: string, menuCategoryId?: string) {
  return useQuery({
    queryKey: ['menu-items', restaurantId, menuCategoryId ?? 'all'],
    queryFn: () => getMenuItems(restaurantId, menuCategoryId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateMenuItem(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MenuItemPayload) => createMenuItem(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Menu item added.')
      await invalidateMenuItemQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add menu item.')
    },
  })
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MenuItemPayload> }) =>
      updateMenuItem(id, payload),

    onSuccess: async () => {
      toast.success('Menu item updated.')
      await invalidateMenuItemQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update menu item.')
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),

    onSuccess: async () => {
      toast.success('Menu item deleted.')
      await invalidateMenuItemQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete menu item.')
    },
  })
}
