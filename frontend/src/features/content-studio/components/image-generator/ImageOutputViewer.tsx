import { ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveImageUrl } from '../../api/images.api'
import type { useGenerateImage } from '../../hooks/use-generate-image'

interface ImageOutputViewerProps {
  generateImage: ReturnType<typeof useGenerateImage>
}

export function ImageOutputViewer({ generateImage }: ImageOutputViewerProps) {
  if (generateImage.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>

        <CardContent role='status' aria-live='polite' className='space-y-2'>
          <p className='sr-only'>Generating image, please wait.</p>
          <Skeleton className='aspect-square w-full max-w-md' />
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
