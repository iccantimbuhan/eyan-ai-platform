import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  type SupplierPayload,
} from '../api/restaurant-ops-api'

function invalidateSupplierQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  ])
}

export function useSuppliers(restaurantId: string) {
  return useQuery({
    queryKey: ['suppliers', restaurantId],
    queryFn: () => getSuppliers(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateSupplier(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SupplierPayload) => createSupplier(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Supplier added.')
      await invalidateSupplierQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add supplier.')
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupplierPayload> }) =>
      updateSupplier(id, payload),

    onSuccess: async () => {
      toast.success('Supplier updated.')
      await invalidateSupplierQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update supplier.')
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),

    onSuccess: async () => {
      toast.success('Supplier deleted.')
      await invalidateSupplierQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete supplier.')
    },
  })
}
