import { useQuery } from '@tanstack/react-query'

import { projectsApi } from '../api/projects.api'

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  })
}
