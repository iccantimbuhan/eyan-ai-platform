import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { automationApi } from '../api/automation-api'
import type {
  CreateMcpServerConfigInput,
  UpdateMcpServerConfigInput,
} from '../types/automation'

const MCP_SERVERS_KEY = ['automation', 'mcp-servers'] as const
const MCP_PROVIDERS_KEY = ['automation', 'mcp-providers'] as const

export function useMcpServers() {
  return useQuery({ queryKey: MCP_SERVERS_KEY, queryFn: automationApi.listMcpServers })
}

// Registered connector names (McpConnectorFactory.listRegistered() —
// "fake" only until a later sprint registers a real one). Rarely changes,
// so a longer staleTime avoids refetching it every time a dialog opens.
export function useMcpProviders() {
  return useQuery({
    queryKey: MCP_PROVIDERS_KEY,
    queryFn: automationApi.listMcpProviders,
    staleTime: 5 * 60 * 1000,
  })
}

function useInvalidateMcpServers() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: MCP_SERVERS_KEY })
}

export function useCreateMcpServer() {
  const invalidate = useInvalidateMcpServers()
  return useMutation({
    mutationFn: (payload: CreateMcpServerConfigInput) =>
      automationApi.createMcpServer(payload),
    onSuccess: async () => {
      toast.success('MCP server registered successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to register MCP server.'),
  })
}

export function useUpdateMcpServer() {
  const invalidate = useInvalidateMcpServers()
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: UpdateMcpServerConfigInput
    }) => automationApi.updateMcpServer(id, values),
    onSuccess: async () => {
      toast.success('MCP server updated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to update MCP server.'),
  })
}

export function useDeleteMcpServer() {
  const invalidate = useInvalidateMcpServers()
  return useMutation({
    mutationFn: (id: string) => automationApi.deleteMcpServer(id),
    onSuccess: async () => {
      toast.success('MCP server removed successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to remove MCP server.'),
  })
}

export function useCheckMcpServerHealth() {
  const invalidate = useInvalidateMcpServers()
  return useMutation({
    mutationFn: (id: string) => automationApi.checkMcpServerHealth(id),
    onSuccess: async () => {
      toast.success('Health check completed.')
      await invalidate()
    },
    onError: () => toast.error('Health check failed to run.'),
  })
}
