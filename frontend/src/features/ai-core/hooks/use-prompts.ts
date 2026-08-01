import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiPromptInput } from '../types/ai-core'

const promptsKey = (brainId: string) => ['ai-core', 'brains', brainId, 'prompts'] as const

export function usePrompts(brainId: string) {
  return useQuery({
    queryKey: promptsKey(brainId),
    queryFn: () => aiCoreApi.listPrompts(brainId),
    enabled: Boolean(brainId),
  })
}

function useInvalidatePrompts(brainId: string) {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: promptsKey(brainId) })
}

export function useCreatePrompt(brainId: string) {
  const invalidate = useInvalidatePrompts(brainId)
  return useMutation({
    mutationFn: (payload: CreateAiPromptInput) => aiCoreApi.createPrompt(brainId, payload),
    onSuccess: async () => {
      toast.success('Prompt version created successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to create prompt version.'),
  })
}

export function useActivatePrompt(brainId: string) {
  const invalidate = useInvalidatePrompts(brainId)
  return useMutation({
    mutationFn: (promptId: string) => aiCoreApi.activatePrompt(brainId, promptId),
    onSuccess: async () => {
      toast.success('Prompt version activated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to activate prompt version.'),
  })
}
