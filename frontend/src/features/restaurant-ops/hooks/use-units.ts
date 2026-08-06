import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createUnit, deleteUnit, getUnits, updateUnit } from '../api/restaurant-ops-api'

export function useUnits(restaurantId: string) {
  return useQuery({
    queryKey: ['units', restaurantId],
    queryFn: () => getUnits(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateUnit(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; abbreviation: string }) =>
      createUnit(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Unit added.')
      await queryClient.invalidateQueries({ queryKey: ['units'] })
    },

    onError: () => {
      toast.error('Failed to add unit.')
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { name?: string; abbreviation?: string }
    }) => updateUnit(id, payload),

    onSuccess: async () => {
      toast.success('Unit updated.')
      await queryClient.invalidateQueries({ queryKey: ['units'] })
    },

    onError: () => {
      toast.error('Failed to update unit.')
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteUnit(id),

    onSuccess: async () => {
      toast.success('Unit deleted.')
      await queryClient.invalidateQueries({ queryKey: ['units'] })
    },

    onError: () => {
      toast.error('Failed to delete unit.')
    },
  })
}
