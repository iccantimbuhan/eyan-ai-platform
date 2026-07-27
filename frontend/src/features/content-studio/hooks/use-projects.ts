import { useQuery } from '@tanstack/react-query'

import { projectsApi } from '../api/projects.api'

export function useProjects() {
  return useQuery({
    queryKey: ['content-projects'],
    queryFn: async () => {
      try {
        const result = await projectsApi.getProjects()

        console.log('✅ getProjects result:', result)

        return result
      } catch (error) {
        console.error('❌ getProjects failed:', error)

        throw error
      }
    },
  })
}
