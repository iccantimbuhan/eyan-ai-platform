import { useHealth } from '@/features/dashboard/hooks/useHealth'
import { useModels } from '@/features/dashboard/hooks/useModels'

export function useProviders() {
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useHealth()
  const { data: models, isLoading: modelsLoading, error: modelsError, refetch: refetchModels } = useModels()

  const ollamaStatus = healthLoading
    ? 'disconnected' as const
    : healthError
      ? 'disconnected' as const
      : health?.status === 'healthy'
        ? 'connected' as const
        : 'error' as const

  const refetchAll = async () => {
    await Promise.all([refetchHealth(), refetchModels()])
  }

  return {
    ollama: {
      status: ollamaStatus,
      endpoint: health?.provider === 'ollama' ? 'http://localhost:11434' : undefined,
      currentModel: health?.model,
      installedModels: models?.count,
      version: health?.version,
    },
    isLoading: healthLoading || modelsLoading,
    error: healthError || modelsError,
    refetch: refetchAll,
    refetchHealth,
    refetchModels,
  }
}
