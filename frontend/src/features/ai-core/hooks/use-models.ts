import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { CreateAiModelInput, UpdateAiModelInput } from '../types/ai-core'

const MODELS_KEY = ['ai-core', 'models'] as const

export function useModels() {
  return useQuery({ queryKey: MODELS_KEY, queryFn: () => aiCoreApi.listModels() })
}

function useInvalidateModels() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: MODELS_KEY })
}

export function useCreateModel() {
  const invalidate = useInvalidateModels()
  return useMutation({
    mutationFn: (payload: CreateAiModelInput) => aiCoreApi.createModel(payload),
    onSuccess: async () => {
      toast.success('Model registered successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to register model.'),
  })
}

export function useUpdateModel() {
  const invalidate = useInvalidateModels()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAiModelInput }) => aiCoreApi.updateModel(id, payload),
    onSuccess: async () => {
      toast.success('Model updated successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to update model.'),
  })
}

export function useDeleteModel() {
  const invalidate = useInvalidateModels()
  return useMutation({
    mutationFn: (id: string) => aiCoreApi.deleteModel(id),
    onSuccess: async () => {
      toast.success('Model removed successfully.')
      await invalidate()
    },
    onError: () => toast.error('Failed to remove model.'),
  })
}
