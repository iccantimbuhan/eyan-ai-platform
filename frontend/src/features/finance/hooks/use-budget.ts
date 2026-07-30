import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBudget, setBudget } from '../api/finance-api'

export function useBudget(period?: string) {
  return useQuery({
    queryKey: ['finance-budget', period ?? null],
    queryFn: () => getBudget(period),
    retry: false,
  })
}

export function useSetBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { period: string; monthlyLimit: string }) => setBudget(payload),

    onSuccess: async () => {
      toast.success('Monthly budget updated.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance-budget'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] }),
      ])
    },

    onError: () => {
      toast.error('Failed to update budget.')
    },
  })
}
