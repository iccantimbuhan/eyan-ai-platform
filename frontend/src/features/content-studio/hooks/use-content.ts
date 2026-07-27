import { useQuery } from '@tanstack/react-query'

import { contentApi } from '../api/content.api'

export function useContent(projectId: string) {
  return useQuery({
    queryKey: ['project-content', projectId],
    queryFn: () => contentApi.getContent(projectId),
    enabled: !!projectId,
  })
}
