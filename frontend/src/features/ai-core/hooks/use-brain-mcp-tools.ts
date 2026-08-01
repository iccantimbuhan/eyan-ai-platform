import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiBrainMcpToolInput } from '../types/ai-core'

const mcpToolsKey = (brainId: string) => ['ai-core', 'brains', brainId, 'mcp-tools'] as const

export function useBrainMcpTools(brainId: string) {
  return useQuery({
    queryKey: mcpToolsKey(brainId),
    queryFn: () => aiCoreApi.listBrainMcpTools(brainId),
    enabled: Boolean(brainId),
  })
}

function useInvalidateBrainMcpTools(brainId: string) {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: mcpToolsKey(brainId) })
}

export function useAllowBrainMcpTool(brainId: string) {
  const invalidate = useInvalidateBrainMcpTools(brainId)
  return useMutation({
    mutationFn: (payload: CreateAiBrainMcpToolInput) => aiCoreApi.allowBrainMcpTool(brainId, payload),
    onSuccess: async () => {
      toast.success('MCP tool allowance added successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to add MCP tool allowance.'),
  })
}

export function useRevokeBrainMcpTool(brainId: string) {
  const invalidate = useInvalidateBrainMcpTools(brainId)
  return useMutation({
    mutationFn: (mcpToolId: string) => aiCoreApi.revokeBrainMcpTool(brainId, mcpToolId),
    onSuccess: async () => {
      toast.success('MCP tool allowance revoked successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to revoke MCP tool allowance.'),
  })
}
