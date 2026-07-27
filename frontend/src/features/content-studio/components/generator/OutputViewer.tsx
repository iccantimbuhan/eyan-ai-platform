import { Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import type { useGenerateContent } from '../../hooks/use-generate-content'

interface OutputViewerProps {
  generateContent: ReturnType<typeof useGenerateContent>
}

export function OutputViewer({ generateContent }: OutputViewerProps) {
  if (generateContent.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>

        <CardContent
          role='status'
          aria-live='polite'
          className='space-y-2'
        >
          <p className='sr-only'>Generating content, please wait.</p>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-3/4' />
        </CardContent>
      </Card>
    )
  }

  if (!generateContent.data) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
          <Sparkles className='h-8 w-8 text-muted-foreground' />

          <p className='text-sm text-muted-foreground'>
            Generated content will appear here.
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

      <CardContent>
        <p className='whitespace-pre-wrap text-sm'>
          {generateContent.data.output}
        </p>
      </CardContent>
    </Card>
  )
}
