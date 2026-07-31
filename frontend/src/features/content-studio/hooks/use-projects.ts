import { useQuery } from '@tanstack/react-query'

import { projectsApi } from '../api/projects.api'

export function useProjects() {
  return useQuery({
    queryKey: ['content-projects'],
    queryFn: () => projectsApi.getProjects(),
  })
}
