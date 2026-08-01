import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiRoutingPolicyInput } from '../types/ai-core'

const routingPolicyKey = (brainId: string) => ['ai-core', 'brains', brainId, 'routing-policy'] as const

export function useRoutingPolicies(brainId: string) {
  return useQuery({
    queryKey: routingPolicyKey(brainId),
    queryFn: () => aiCoreApi.listRoutingPolicies(brainId),
    enabled: Boolean(brainId),
  })
}

function useInvalidateRoutingPolicies(brainId: string) {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: routingPolicyKey(brainId) })
}

export function useCreateRoutingPolicy(brainId: string) {
  const invalidate = useInvalidateRoutingPolicies(brainId)
  return useMutation({
    mutationFn: (payload: CreateAiRoutingPolicyInput) => aiCoreApi.createRoutingPolicy(brainId, payload),
    onSuccess: async () => {
      toast.success('Routing policy created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create routing policy.'),
  })
}

export function useActivateRoutingPolicy(brainId: string) {
  const invalidate = useInvalidateRoutingPolicies(brainId)
  return useMutation({
    mutationFn: (policyId: string) => aiCoreApi.activateRoutingPolicy(brainId, policyId),
    onSuccess: async () => {
      toast.success('Routing policy activated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to activate routing policy.'),
  })
}
