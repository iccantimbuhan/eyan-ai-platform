import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createChannelEntry,
  createCategoryEntry,
  createDailySalesRecord,
  createItemEntry,
  createPaymentMethodEntry,
  deleteChannelEntry,
  deleteCategoryEntry,
  deleteItemEntry,
  deletePaymentMethodEntry,
  getDailySales,
  getDailySalesRecords,
  getSalesComparison,
  getSalesRecord,
  getWeeklySalesSummary,
  updateDailySalesRecord,
  type CreateDailySalesRecordPayload,
} from '../api/restaurant-ops-api'

export function useDailySalesRecords(branchId: string) {
  return useQuery({
    queryKey: ['sales-records', branchId],
    queryFn: () => getDailySalesRecords(branchId),
    enabled: Boolean(branchId),
  })
}

export function useDailySales(branchId: string, date: string) {
  return useQuery({
    queryKey: ['daily-sales', branchId, date],
    queryFn: () => getDailySales(branchId, date),
    enabled: Boolean(branchId) && Boolean(date),
  })
}

// Fetches one sales record by its own id, independent of the parent page's
// date-scoped query — used by DailySalesDialog so its line-entry sections
// always render the live record regardless of how the dialog got its id
// (a fresh create response or an existing record passed in for editing).
export function useSalesRecord(salesId: string | null) {
  return useQuery({
    queryKey: ['sales-record', salesId],
    queryFn: () => getSalesRecord(salesId as string),
    enabled: Boolean(salesId),
  })
}

export function useWeeklySalesSummary(branchId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['weekly-sales', branchId, startDate, endDate],
    queryFn: () => getWeeklySalesSummary(branchId, startDate, endDate),
    enabled: Boolean(branchId) && Boolean(startDate) && Boolean(endDate),
  })
}

// currentRange/previousRange are both supplied by the caller — this hook
// never infers the previous period itself.
export function useSalesComparison(
  branchId: string,
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
) {
  return useQuery({
    queryKey: ['sales-comparison', branchId, currentStartDate, currentEndDate, previousStartDate, previousEndDate],
    queryFn: () => getSalesComparison(branchId, currentStartDate, currentEndDate, previousStartDate, previousEndDate),
    enabled:
      Boolean(branchId) &&
      Boolean(currentStartDate) &&
      Boolean(currentEndDate) &&
      Boolean(previousStartDate) &&
      Boolean(previousEndDate),
  })
}

// Every mutation below invalidates the whole 'daily-sales'/'sales-records'/
// 'weekly-sales' families rather than one precise key, same posture as
// use-inventory.ts's broad invalidation after a movement.
function invalidateSalesQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['daily-sales'] }),
    queryClient.invalidateQueries({ queryKey: ['sales-records'] }),
    queryClient.invalidateQueries({ queryKey: ['sales-record'] }),
    queryClient.invalidateQueries({ queryKey: ['weekly-sales'] }),
  ])
}

export function useCreateDailySalesRecord(branchId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDailySalesRecordPayload) => createDailySalesRecord(branchId, payload),

    onSuccess: async () => {
      toast.success('Daily sales record created.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to create daily sales record.')
    },
  })
}

export function useUpdateDailySalesRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      salesId,
      payload,
    }: {
      salesId: string
      payload: Partial<CreateDailySalesRecordPayload>
    }) => updateDailySalesRecord(salesId, payload),

    onSuccess: async () => {
      toast.success('Daily sales record updated.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update daily sales record.')
    },
  })
}

export function useCreateChannelEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      salesId,
      salesChannelId,
      amount,
      posSourceId,
      transactionCount,
    }: {
      salesId: string
      salesChannelId: string
      amount: number
      posSourceId?: string
      transactionCount?: number
    }) => createChannelEntry(salesId, { salesChannelId, amount, posSourceId, transactionCount }),

    onSuccess: async () => {
      toast.success('Channel entry recorded.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to record channel entry.')
    },
  })
}

export function useDeleteChannelEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ salesId, entryId }: { salesId: string; entryId: string }) =>
      deleteChannelEntry(salesId, entryId),

    onSuccess: async () => {
      toast.success('Channel entry deleted.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete channel entry.')
    },
  })
}

export function useCreatePaymentMethodEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      salesId,
      salesPaymentMethodId,
      amount,
      posSourceId,
      transactionCount,
    }: {
      salesId: string
      salesPaymentMethodId: string
      amount: number
      posSourceId?: string
      transactionCount?: number
    }) => createPaymentMethodEntry(salesId, { salesPaymentMethodId, amount, posSourceId, transactionCount }),

    onSuccess: async () => {
      toast.success('Payment method entry recorded.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to record payment method entry.')
    },
  })
}

export function useDeletePaymentMethodEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ salesId, entryId }: { salesId: string; entryId: string }) =>
      deletePaymentMethodEntry(salesId, entryId),

    onSuccess: async () => {
      toast.success('Payment method entry deleted.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete payment method entry.')
    },
  })
}

export function useCreateCategoryEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      salesId,
      salesCategoryId,
      quantity,
      amount,
    }: {
      salesId: string
      salesCategoryId: string
      quantity?: number
      amount: number
    }) => createCategoryEntry(salesId, { salesCategoryId, quantity, amount }),

    onSuccess: async () => {
      toast.success('Category entry recorded.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to record category entry.')
    },
  })
}

export function useDeleteCategoryEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ salesId, entryId }: { salesId: string; entryId: string }) =>
      deleteCategoryEntry(salesId, entryId),

    onSuccess: async () => {
      toast.success('Category entry deleted.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete category entry.')
    },
  })
}

export function useCreateItemEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      salesId,
      menuItemId,
      itemName,
      categoryName,
      quantity,
      amount,
      posQuantityPercent,
      posSalesPercent,
    }: {
      salesId: string
      menuItemId?: string
      itemName: string
      categoryName?: string
      quantity: number
      amount: number
      posQuantityPercent?: number
      posSalesPercent?: number
    }) =>
      createItemEntry(salesId, {
        menuItemId,
        itemName,
        categoryName,
        quantity,
        amount,
        posQuantityPercent,
        posSalesPercent,
      }),

    onSuccess: async () => {
      toast.success('Item entry recorded.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to record item entry.')
    },
  })
}

export function useDeleteItemEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ salesId, entryId }: { salesId: string; entryId: string }) =>
      deleteItemEntry(salesId, entryId),

    onSuccess: async () => {
      toast.success('Item entry deleted.')
      await invalidateSalesQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete item entry.')
    },
  })
}
