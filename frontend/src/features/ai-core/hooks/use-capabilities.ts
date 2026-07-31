import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiCapabilityInput } from '../types/ai-core'

const CAPABILITIES_KEY = ['ai-core', 'capabilities'] as const

export function useCapabilities() {
  return useQuery({ queryKey: CAPABILITIES_KEY, queryFn: aiCoreApi.listCapabilities })
}

function useInvalidateCapabilities() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: CAPABILITIES_KEY })
}

export function useCreateCapability() {
  const invalidate = useInvalidateCapabilities()
  return useMutation({
    mutationFn: (payload: CreateAiCapabilityInput) => aiCoreApi.createCapability(payload),
    onSuccess: async () => {
      toast.success('Capability created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create Capability.'),
  })
}

export function useDeleteCapability() {
  const invalidate = useInvalidateCapabilities()
  return useMutation({
    mutationFn: (id: string) => aiCoreApi.deleteCapability(id),
    onSuccess: async () => {
      toast.success('Capability removed successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to remove Capability.'),
  })
}
