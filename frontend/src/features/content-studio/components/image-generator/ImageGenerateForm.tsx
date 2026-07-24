import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import { useImageProviderPreference } from '../../hooks/use-image-provider-preference'
import { IMAGE_PROVIDER_OPTIONS } from '../../types/image'

interface ImageGenerateFormProps {
  projectId: string
  generateImage: ReturnType<typeof useGenerateImage>
}

// The backend already sanitizes every generation failure into a safe,
// specific message before it ever reaches the API response (differentiated
// by failure stage — provider vs. storage vs. invalid request; see
// backend/src/services/image.service.ts) — so it's safe to show that
// message directly instead of one generic string. Falls back to a generic
// message only when there's no server-provided one to show (e.g. the
// request never reached the backend at all).
function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (
      error.response?.data as { error?: string } | undefined
    )?.error

    if (serverMessage) return serverMessage
  }

  return 'Failed to generate image. Please try again.'
}

export function ImageGenerateForm({
  projectId,
  generateImage,
}: ImageGenerateFormProps) {
  const [prompt, setPrompt] = useState('')
  const { provider, setProvider } = useImageProviderPreference()

  const canGenerate = prompt.trim().length > 0

  const handleGenerate = () => {
    generateImage.mutate({
      projectId,
      prompt: prompt.trim(),
      ...(provider === 'auto' ? {} : { provider }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Image</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='image-provider'>Provider</Label>

          <Select
            value={provider}
            onValueChange={(value) =>
              setProvider(
                value as (typeof IMAGE_PROVIDER_OPTIONS)[number]['value']
              )
            }
          >
            <SelectTrigger id='image-provider' className='w-full sm:w-64'>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {IMAGE_PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='image-prompt'>Prompt</Label>

          <Textarea
            id='image-prompt'
            placeholder='Describe the image you want to generate...'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className='min-h-32'
          />
        </div>

        {generateImage.isError && (
          <p className='text-sm text-destructive'>
            {extractErrorMessage(generateImage.error)}
          </p>
        )}

        <Button
          className='w-full sm:w-auto'
          disabled={!canGenerate || generateImage.isPending}
          onClick={handleGenerate}
        >
          {generateImage.isPending ? 'Generating...' : 'Generate'}
        </Button>
      </CardContent>
    </Card>
  )
}
