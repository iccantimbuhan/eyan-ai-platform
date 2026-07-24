import { useMutation } from '@tanstack/react-query'
import { imagesApi, type GenerateImageRequest } from '../api/images.api'

// No query invalidation on success — unlike useGenerateContent, there's no
// image gallery/history list view yet for this to keep in sync with (see
// Sprint 4.3's sprint log for that deferral). Add one here if/when that
// list view ships.
export function useGenerateImage() {
  return useMutation({
    mutationFn: (payload: GenerateImageRequest) =>
      imagesApi.generateImage(payload),
  })
}
