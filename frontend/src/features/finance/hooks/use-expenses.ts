import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
  type ExpensePayload,
  type ListExpensesParams,
} from '../api/finance-api'

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['finance-expenses'] }),
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] }),
  ])
}

export function useExpenses(params: ListExpensesParams = {}) {
  return useQuery({
    queryKey: ['finance-expenses', params],
    queryFn: () => getExpenses(params),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ExpensePayload) => createExpense(payload),

    onSuccess: async () => {
      toast.success('Expense added.')
      await invalidateFinanceQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add expense.')
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<Omit<ExpensePayload, 'isRecurring'>>
    }) => updateExpense(id, payload),

    onSuccess: async () => {
      toast.success('Expense updated.')
      await invalidateFinanceQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update expense.')
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),

    onSuccess: async () => {
      toast.success('Expense deleted.')
      await invalidateFinanceQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete expense.')
    },
  })
}
