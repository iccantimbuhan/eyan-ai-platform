import { useQuery } from '@tanstack/react-query'
import { aiCoreApi } from '../api/ai-core-api'

export function useAiCoreHealth() {
  return useQuery({ queryKey: ['ai-core', 'health'], queryFn: aiCoreApi.healthOverview })
}
