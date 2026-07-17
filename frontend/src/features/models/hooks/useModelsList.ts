import { useMemo, useState } from 'react'
import { useModels as useModelsFetch } from '@/features/dashboard/hooks/useModels'
import { type ModelInfo } from '@/features/ai-chat/services/chat.service'

type SortKey = 'name' | 'size' | 'parameters' | 'family'
type SortDirection = 'asc' | 'desc'

export function useModelsList() {
  const { data, isLoading, error, refetch } = useModelsFetch()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const filteredAndSorted = useMemo(() => {
    const models: ModelInfo[] = data?.models ?? []

    // Filter by search
    const lower = search.toLowerCase()
    const filtered = lower
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(lower) ||
            m.family.toLowerCase().includes(lower)
        )
      : models

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'size') {
        cmp = a.size - b.size
      } else if (sortKey === 'parameters') {
        cmp = a.parameters.localeCompare(b.parameters)
      } else if (sortKey === 'family') {
        cmp = a.family.localeCompare(b.family)
      } else {
        cmp = a.name.localeCompare(b.name)
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [data?.models, search, sortKey, sortDirection])

  return {
    models: filteredAndSorted,
    totalCount: data?.count ?? 0,
    isLoading,
    error,
    refetch,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
  }
}
