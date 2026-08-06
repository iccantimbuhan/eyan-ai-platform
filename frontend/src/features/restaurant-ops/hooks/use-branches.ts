import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createBranch, deleteBranch, getBranches, updateBranch } from '../api/restaurant-ops-api'

function invalidateBranchQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['branches'] }),
    queryClient.invalidateQueries({ queryKey: ['tenant-context'] }),
  ])
}

export function useBranches(restaurantId: string) {
  return useQuery({
    queryKey: ['branches', restaurantId],
    queryFn: () => getBranches(restaurantId),
    enabled: Boolean(restaurantId),
  })
}

export function useCreateBranch(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string }) => createBranch(restaurantId, payload),

    onSuccess: async () => {
      toast.success('Branch added.')
      await invalidateBranchQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to add branch.')
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string } }) =>
      updateBranch(id, payload),

    onSuccess: async () => {
      toast.success('Branch updated.')
      await invalidateBranchQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to update branch.')
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),

    onSuccess: async () => {
      toast.success('Branch deleted.')
      await invalidateBranchQueries(queryClient)
    },

    onError: () => {
      toast.error('Failed to delete branch.')
    },
  })
}
