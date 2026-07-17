import { useState, useEffect, useCallback } from 'react'
import { getHealth, type HealthResponse } from '@/features/ai-chat/services/chat.service'

type UseHealthResult = {
  data: HealthResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
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
    } catch {
      setError('Unable to reach backend')
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
