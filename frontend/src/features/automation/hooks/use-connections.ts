import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { automationApi } from '../api/automation-api'
import type { CreateConnectionInput, UpdateConnectionInput } from '../types/automation'

const CONNECTIONS_KEY = ['automation', 'connections'] as const

export function useConnections() {
  return useQuery({ queryKey: CONNECTIONS_KEY, queryFn: automationApi.listConnections })
}

function useInvalidateConnections() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: CONNECTIONS_KEY })
}

export function useCreateConnection() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: (payload: CreateConnectionInput) =>
      automationApi.createConnection(payload),
    onSuccess: async () => {
      toast.success('Connection created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create connection.'),
  })
}

export function useUpdateConnection() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateConnectionInput }) =>
      automationApi.updateConnection(id, values),
    onSuccess: async () => {
      toast.success('Connection updated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to update connection.'),
  })
}

export function useDeleteConnection() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: (id: string) => automationApi.deleteConnection(id),
    onSuccess: async () => {
      toast.success('Connection deleted successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to delete connection.'),
  })
}

export function useRotateConnectionCredentials() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: ({
      id,
      credentials,
    }: {
      id: string
      credentials: Record<string, unknown>
    }) => automationApi.rotateConnectionCredentials(id, credentials),
    onSuccess: async () => {
      toast.success('Credentials rotated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to rotate credentials.'),
  })
}

export function useEnableConnection() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: (id: string) => automationApi.enableConnection(id),
    onSuccess: async () => {
      toast.success('Connection enabled.')
      await invalidate()
    },
    onError: () => toast.error('Failed to enable connection.'),
  })
}

export function useDisableConnection() {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: (id: string) => automationApi.disableConnection(id),
    onSuccess: async () => {
      toast.success('Connection disabled.')
      await invalidate()
    },
    onError: () => toast.error('Failed to disable connection.'),
  })
}
