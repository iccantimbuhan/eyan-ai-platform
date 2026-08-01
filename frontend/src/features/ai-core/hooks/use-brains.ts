import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiBrainInput, UpdateAiBrainInput } from '../types/ai-core'

const BRAINS_KEY = ['ai-core', 'brains'] as const

export function useBrains() {
  return useQuery({ queryKey: BRAINS_KEY, queryFn: aiCoreApi.listBrains })
}

function useInvalidateBrains() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: BRAINS_KEY })
}

export function useCreateBrain() {
  const invalidate = useInvalidateBrains()
  return useMutation({
    mutationFn: (payload: CreateAiBrainInput) => aiCoreApi.createBrain(payload),
    onSuccess: async () => {
      toast.success('Brain created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create Brain.'),
  })
}

export function useUpdateBrain() {
  const invalidate = useInvalidateBrains()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAiBrainInput }) => aiCoreApi.updateBrain(id, payload),
    onSuccess: async () => {
      toast.success('Brain updated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to update Brain.'),
  })
}

export function useDeleteBrain() {
  const invalidate = useInvalidateBrains()
  return useMutation({
    mutationFn: (id: string) => aiCoreApi.deleteBrain(id),
    onSuccess: async () => {
      toast.success('Brain removed successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to remove Brain — check it has no Capabilities still pointing to it.'),
  })
}
