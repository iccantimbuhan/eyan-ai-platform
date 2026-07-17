import { useState, useEffect, useCallback } from 'react'
import { getModels, type ModelsResponse } from '@/features/ai-chat/services/chat.service'

type UseModelsResult = {
  data: ModelsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useModels(): UseModelsResult {
  const [data, setData] = useState<ModelsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getModels()
      setData(result)
    } catch {
      setError('Unable to fetch models')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return { data, isLoading, error, refetch: fetchModels }
}
