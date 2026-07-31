import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aiCoreApi } from '../api/ai-core-api'
import type { PlaygroundInvokeInput } from '../types/ai-core'

const HISTORY_KEY = ['ai-core', 'playground-history'] as const

export function usePlaygroundHistory(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...HISTORY_KEY, page, pageSize],
    queryFn: () => aiCoreApi.playgroundHistory({ page, pageSize }),
  })
}

export function useInvokePlayground() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: PlaygroundInvokeInput) => aiCoreApi.invokePlayground(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: HISTORY_KEY })
    },
    onError: () => toast.error('Playground execution failed.'),
  })
}
