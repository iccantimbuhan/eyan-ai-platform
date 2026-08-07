import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createSalesCategory,
  createSalesChannel,
  createSalesPaymentMethod,
  getSalesCategories,
  getSalesChannels,
  getSalesPaymentMethods,
} from '../api/restaurant-ops-api'

// Restaurant-scoped configurable vocabulary (Sprint 2C, ADR-0039) — same
// posture as use-units.ts. Create+list only, no update/delete in this
// sprint (mirrors Inventory's own minimalism).

export function useSalesChannels(restaurantId: string) {
  return useQuery({
    queryKey: ['sales-channels', restaurantId],
    queryFn: () => getSalesChannels(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateSalesChannel(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createSalesChannel(restaurantId, { name }),

    onSuccess: async () => {
      toast.success('Sales channel added.')
      await queryClient.invalidateQueries({ queryKey: ['sales-channels', restaurantId] })
    },

    onError: () => {
      toast.error('Failed to add sales channel.')
    },
  })
}

export function useSalesPaymentMethods(restaurantId: string) {
  return useQuery({
    queryKey: ['sales-payment-methods', restaurantId],
    queryFn: () => getSalesPaymentMethods(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateSalesPaymentMethod(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createSalesPaymentMethod(restaurantId, { name }),

    onSuccess: async () => {
      toast.success('Payment method added.')
      await queryClient.invalidateQueries({ queryKey: ['sales-payment-methods', restaurantId] })
    },

    onError: () => {
      toast.error('Failed to add payment method.')
    },
  })
}

export function useSalesCategories(restaurantId: string) {
  return useQuery({
    queryKey: ['sales-categories', restaurantId],
    queryFn: () => getSalesCategories(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateSalesCategory(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createSalesCategory(restaurantId, { name }),

    onSuccess: async () => {
      toast.success('Sales category added.')
      await queryClient.invalidateQueries({ queryKey: ['sales-categories', restaurantId] })
    },

    onError: () => {
      toast.error('Failed to add sales category.')
    },
  })
}
