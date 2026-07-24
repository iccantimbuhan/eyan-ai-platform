import { ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveImageUrl } from '../../api/images.api'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import type { ImageProviderOption } from '../../types/image'

interface ImageOutputViewerProps {
  generateImage: ReturnType<typeof useGenerateImage>
  provider: ImageProviderOption
}

// Honest, static copy about each provider's real generation-time
// characteristics — not a live estimate, just enough context that a long
// wait on ComfyUI/Hugging Face doesn't look identical to a stuck request.
// "auto" and "fake" get the plain default message.
const PROVIDER_LOADING_HINTS: Partial<Record<ImageProviderOption, string>> = {
  comfyui:
    'ComfyUI can take a minute or more, especially the first time a model loads.',
  huggingface:
    'Hugging Face is usually fast, but a cold model can take up to a minute to start.',
  gemini: 'Gemini typically responds within a few seconds.',
}

export function ImageOutputViewer({
  generateImage,
  provider,
}: ImageOutputViewerProps) {
  if (generateImage.isPending) {
    const hint = PROVIDER_LOADING_HINTS[provider]

    return (
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>

        <CardContent role='status' aria-live='polite' className='space-y-2'>
          <p className='sr-only'>Generating image, please wait.</p>
          <Skeleton className='aspect-square w-full max-w-md' />
          {hint && <p className='text-sm text-muted-foreground'>{hint}</p>}
        </CardContent>
      </Card>
    )
  }

  const image = generateImage.data

  if (!image) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
          <ImageIcon className='h-8 w-8 text-muted-foreground' />

          <p className='text-sm text-muted-foreground'>
            Generated images will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Output</CardTitle>
      </CardHeader>

      <CardContent className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline'>{image.provider}</Badge>

          {image.status === 'FAILED' && (
            <Badge variant='destructive'>Failed</Badge>
          )}
        </div>

        {image.status === 'COMPLETED' && image.storagePath ? (
          <img
            src={resolveImageUrl(image.storagePath)}
            alt={image.prompt}
            className='max-w-md rounded-lg border'
          />
        ) : (
          <p className='text-sm text-destructive'>
            {image.errorMessage ?? 'Image generation did not complete.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
