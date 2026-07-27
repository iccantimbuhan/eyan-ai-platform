import { ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveImageUrl } from '../../api/images.api'
import { useImages } from '../../hooks/use-images'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import type { GeneratedImageItem, ImageProviderOption } from '../../types/image'

interface ImageOutputViewerProps {
  projectId: string
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

function ImageThumbnail({ item }: { item: GeneratedImageItem }) {
  if (item.status === 'COMPLETED' && item.storagePath) {
    return (
      <img
        src={resolveImageUrl(item.storagePath)}
        alt={item.prompt}
        className='h-20 w-20 rounded-md border object-cover'
      />
    )
  }

  return (
    <div className='flex h-20 w-20 items-center justify-center rounded-md border text-xs text-destructive'>
      Failed
    </div>
  )
}

export function ImageOutputViewer({
  projectId,
  generateImage,
  provider,
}: ImageOutputViewerProps) {
  const images = useImages(projectId)

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

  if (images.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>

        <CardContent
          role='status'
          aria-label='Loading generated images'
          className='space-y-2'
        >
          <Skeleton className='aspect-square w-full max-w-md' />
        </CardContent>
      </Card>
    )
  }

  if (images.isError) {
    return (
      <Card>
        <CardContent className='py-8'>
          <p className='text-sm text-destructive'>
            Failed to load generated images. Try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  const items = images.data?.items ?? []
  const [image, ...previousImages] = items

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

      {previousImages.length > 0 && (
        <CardContent className='space-y-2 border-t pt-4'>
          <p className='text-sm font-medium text-muted-foreground'>
            Previous images
          </p>

          <div className='flex flex-wrap gap-2'>
            {previousImages.map((item) => (
              <ImageThumbnail key={item.id} item={item} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
