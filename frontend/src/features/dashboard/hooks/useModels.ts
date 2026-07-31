import { useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'
import {
  getModels,
  type ModelsResponse,
} from '@/features/ai-chat/services/chat.service'

type UseModelsResult = {
  data: ModelsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function describeError(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response) {
      return `Models request returned HTTP ${error.response.status}`
    }
    if (error.code === 'ECONNABORTED') {
      return 'Models request timed out'
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Models network request failed'
    }
    return error.message || 'Models request failed'
  }

  if (error instanceof TypeError) {
    return `Models request failed: ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to fetch models'
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
    } catch (error) {
      setError(describeError(error))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getModels()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setError(describeError(error))
        setData(null)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, isLoading, error, refetch: fetchModels }
}
