import { useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesApi, type GenerateImageRequest } from '../api/images.api'

export function useGenerateImage(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GenerateImageRequest) =>
      imagesApi.generateImage(payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-images', projectId],
      })
    },
  })
}
