import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPosSource,
  createSalesCategory,
  createSalesChannel,
  createSalesPaymentMethod,
  deleteSalesChannelMenuItem,
  getPosSources,
  getSalesCategories,
  getSalesChannelMenuItems,
  getSalesChannels,
  getSalesPaymentMethods,
  updateSalesPaymentMethod,
  upsertSalesChannelMenuItem,
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

// ADR-0043 — the only reference-list update in this sprint: retroactively
// flags an existing payment method as physical cash for Cash Reconciliation.
export function useUpdateSalesPaymentMethod(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isCashEquivalent }: { id: string; isCashEquivalent: boolean }) =>
      updateSalesPaymentMethod(restaurantId, id, { isCashEquivalent }),

    onSuccess: async () => {
      toast.success('Payment method updated.')
      await queryClient.invalidateQueries({ queryKey: ['sales-payment-methods', restaurantId] })
      // Cash classification changes what daily/weekly cash reconciliation
      // figures — already-fetched records must recompute, not just the
      // reference list.
      await queryClient.invalidateQueries({ queryKey: ['daily-sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sales-record'] })
      await queryClient.invalidateQueries({ queryKey: ['weekly-sales'] })
    },

    onError: () => {
      toast.error('Failed to update payment method.')
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

// POS Source / Sales Channel Flexibility — a fourth Restaurant-scoped
// reference list, same create+list shape as the three above.
export function usePosSources(restaurantId: string) {
  return useQuery({
    queryKey: ['pos-sources', restaurantId],
    queryFn: () => getPosSources(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreatePosSource(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createPosSource(restaurantId, { name }),

    onSuccess: async () => {
      toast.success('POS source added.')
      await queryClient.invalidateQueries({ queryKey: ['pos-sources', restaurantId] })
    },

    onError: () => {
      toast.error('Failed to add POS source.')
    },
  })
}

// Sprint 2B Prep — channel-specific MenuItem price/availability overrides.
// Read wholesale per restaurant (small dataset), mutated one (channel,
// item) pair at a time.
export function useSalesChannelMenuItems(restaurantId: string) {
  return useQuery({
    queryKey: ['sales-channel-menu-items', restaurantId],
    queryFn: () => getSalesChannelMenuItems(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useUpsertSalesChannelMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      menuItemId,
      salesChannelId,
      payload,
    }: {
      menuItemId: string
      salesChannelId: string
      payload: { price?: number | null; available?: boolean }
    }) => upsertSalesChannelMenuItem(menuItemId, salesChannelId, payload),

    onSuccess: async () => {
      toast.success('Channel price saved.')
      await queryClient.invalidateQueries({ queryKey: ['sales-channel-menu-items'] })
    },

    onError: () => {
      toast.error('Failed to save channel price.')
    },
  })
}

export function useDeleteSalesChannelMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ menuItemId, salesChannelId }: { menuItemId: string; salesChannelId: string }) =>
      deleteSalesChannelMenuItem(menuItemId, salesChannelId),

    onSuccess: async () => {
      toast.success('Channel price override removed.')
      await queryClient.invalidateQueries({ queryKey: ['sales-channel-menu-items'] })
    },

    onError: () => {
      toast.error('Failed to remove channel price override.')
    },
  })
}
