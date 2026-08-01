import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { RunAiEvaluationInput } from '../types/ai-core'

const evaluationsKey = (brainId: string, promptId: string) =>
  ['ai-core', 'brains', brainId, 'prompts', promptId, 'evaluations'] as const

export function useEvaluations(brainId: string, promptId: string | null) {
  return useQuery({
    queryKey: evaluationsKey(brainId, promptId ?? ''),
    queryFn: () => aiCoreApi.listEvaluations(brainId, promptId as string),
    enabled: Boolean(brainId) && Boolean(promptId),
  })
}

export function useRunEvaluation(brainId: string, promptId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<RunAiEvaluationInput, 'promptId'>) => aiCoreApi.runEvaluation(brainId, promptId, payload),
    onSuccess: async (result) => {
      if (result.passed) toast.success('Evaluation passed.')
      else toast.warning('Evaluation ran, but did not pass — see the result for details.')
      await client.invalidateQueries({ queryKey: evaluationsKey(brainId, promptId) })
    },
    onError: () => toast.error('Failed to run evaluation.'),
  })
}
