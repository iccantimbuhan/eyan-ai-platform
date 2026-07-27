import { useQuery } from '@tanstack/react-query'

import { imagesApi } from '../api/images.api'

export function useImages(projectId: string) {
  return useQuery({
    queryKey: ['project-images', projectId],
    queryFn: () => imagesApi.getImages(projectId),
    enabled: !!projectId,
  })
}
