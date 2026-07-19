import { useState, useEffect, useCallback } from 'react'
import { AxiosError } from 'axios'
import { getHealth, type HealthResponse } from '@/features/ai-chat/services/chat.service'

type UseHealthResult = {
  data: HealthResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function describeError(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response) {
      return `Backend returned HTTP ${error.response.status}`
    }
    if (error.code === 'ECONNABORTED') {
      return 'Backend request timed out'
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Backend network request failed'
    }
    return error.message || 'Backend request failed'
  }

  if (error instanceof TypeError) {
    return `Backend request failed: ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to reach backend'
}

export function useHealth(): UseHealthResult {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getHealth()
      setData(result)
    } catch (error) {
      console.error('[useHealth] Failed to load backend health', error)
      setError(describeError(error))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  return { data, isLoading, error, refetch: fetchHealth }
}
