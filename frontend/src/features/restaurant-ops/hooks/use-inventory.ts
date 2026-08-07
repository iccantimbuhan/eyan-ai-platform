import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createAdjustment,
  createInventoryItem,
  createStockCount,
  createWaste,
  getInventoryItems,
  getStockMovements,
  updateInventoryItem,
  type CreateInventoryItemPayload,
} from '../api/restaurant-ops-api'

export function useInventoryItems(branchId: string) {
  return useQuery({
    queryKey: ['inventory-items', branchId],
    queryFn: () => getInventoryItems(branchId),
    enabled: Boolean(branchId),
  })
}

export function useCreateInventoryItem(branchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => createInventoryItem(branchId, payload),

    onSuccess: async () => {
      toast.success('Opening stock recorded.')
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },

    onError: () => {
      toast.error('Failed to record opening stock.')
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, minimumQuantity }: { id: string; minimumQuantity: number }) =>
      updateInventoryItem(id, { minimumQuantity }),

    onSuccess: async () => {
      toast.success('Minimum stock threshold updated.')
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },

    onError: () => {
      toast.error('Failed to update minimum stock threshold.')
    },
  })
}

export function useStockMovements(inventoryItemId: string) {
  return useQuery({
    queryKey: ['stock-movements', inventoryItemId],
    queryFn: () => getStockMovements(inventoryItemId),
    enabled: Boolean(inventoryItemId),
  })
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      inventoryItemId,
      quantityDelta,
      reason,
    }: {
      inventoryItemId: string
      quantityDelta: number
      reason: string
    }) => createAdjustment(inventoryItemId, { quantityDelta, reason }),

    onSuccess: async (_data, variables) => {
      toast.success('Adjustment recorded.')
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      await queryClient.invalidateQueries({
        queryKey: ['stock-movements', variables.inventoryItemId],
      })
    },

    onError: () => {
      toast.error('Failed to record adjustment.')
    },
  })
}

export function useCreateWaste() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      inventoryItemId,
      quantity,
      reason,
    }: {
      inventoryItemId: string
      quantity: number
      reason: string
    }) => createWaste(inventoryItemId, { quantity, reason }),

    onSuccess: async (_data, variables) => {
      toast.success('Waste recorded.')
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      await queryClient.invalidateQueries({
        queryKey: ['stock-movements', variables.inventoryItemId],
      })
    },

    onError: () => {
      toast.error('Failed to record waste.')
    },
  })
}

export function useCreateStockCount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      inventoryItemId,
      countedQuantity,
      reason,
    }: {
      inventoryItemId: string
      countedQuantity: number
      reason?: string
    }) => createStockCount(inventoryItemId, { countedQuantity, reason }),

    onSuccess: async (_data, variables) => {
      toast.success('Stock count recorded.')
      await queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      await queryClient.invalidateQueries({
        queryKey: ['stock-movements', variables.inventoryItemId],
      })
    },

    onError: () => {
      toast.error('Failed to record stock count.')
    },
  })
}
