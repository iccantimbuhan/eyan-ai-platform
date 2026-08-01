import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiProviderInput, UpdateAiProviderInput } from '../types/ai-core'

const PROVIDERS_KEY = ['ai-core', 'providers'] as const
const PLUGINS_KEY = ['ai-core', 'provider-plugins'] as const

export function useProviders() {
  return useQuery({ queryKey: PROVIDERS_KEY, queryFn: aiCoreApi.listProviders })
}

// Registered AiCoreProviderFactory keys ("ollama","openai","anthropic",
// "gemini") — rarely changes, longer staleTime avoids refetching on every
// dialog open (same reasoning as useMcpProviders()).
export function useProviderPlugins() {
  return useQuery({ queryKey: PLUGINS_KEY, queryFn: aiCoreApi.listRegisteredPlugins, staleTime: 5 * 60 * 1000 })
}

function useInvalidateProviders() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: PROVIDERS_KEY })
}

export function useCreateProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: (payload: CreateAiProviderInput) => aiCoreApi.createProvider(payload),
    onSuccess: async () => {
      toast.success('Provider created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create provider.'),
  })
}

export function useUpdateProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAiProviderInput }) =>
      aiCoreApi.updateProvider(id, payload),
    onSuccess: async () => {
      toast.success('Provider updated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to update provider.'),
  })
}

export function useDeleteProvider() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: (id: string) => aiCoreApi.deleteProvider(id),
    onSuccess: async () => {
      toast.success('Provider removed successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to remove provider.'),
  })
}

export function useAddProviderCredential() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: ({ providerId, label, credentials }: { providerId: string; label: string; credentials: Record<string, unknown> }) =>
      aiCoreApi.addProviderCredential(providerId, label, credentials),
    onSuccess: async () => {
      toast.success('Credential added successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to add credential.'),
  })
}

export function useCheckProviderHealth() {
  const invalidate = useInvalidateProviders()
  return useMutation({
    mutationFn: (id: string) => aiCoreApi.checkProviderHealth(id),
    onSuccess: async () => {
      toast.success('Health check completed.')
      await invalidate()
    },
    onError: () => toast.error('Health check failed to run.'),
  })
}
