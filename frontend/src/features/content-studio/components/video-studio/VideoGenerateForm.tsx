import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { BrandKitSelect } from '../brand-kits/BrandKitSelect'
import { useVideoAssets } from '../../hooks/use-video-assets'
import type { useGenerateVideoAsset } from '../../hooks/use-generate-video-asset'
import {
  IMAGE_VIDEO_KINDS,
  TEXT_VIDEO_KINDS,
  VIDEO_KIND_OPTIONS,
  videoKindLabel,
  type VideoAssetKind,
} from '../../types/video-asset'

const NEW_VIDEO_VALUE = '__new__'

interface VideoGenerateFormProps {
  projectId: string
  generateVideoAsset: ReturnType<typeof useGenerateVideoAsset>
}

// Same reasoning as ImageGenerateForm's extractErrorMessage: the backend
// already sanitizes generation failures into a safe message before they
// reach the API response (see backend/src/services/video-asset.service.ts).
function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { error?: string } | undefined)
      ?.error

    if (serverMessage) return serverMessage
  }

  return 'Failed to generate video asset. Please try again.'
}

export function VideoGenerateForm({
  projectId,
  generateVideoAsset,
}: VideoGenerateFormProps) {
  const [kind, setKind] = useState<VideoAssetKind>('SCRIPT')
  const [prompt, setPrompt] = useState('')
  const [videoGroupId, setVideoGroupId] = useState<string>(NEW_VIDEO_VALUE)
  const [brandKitId, setBrandKitId] = useState<string | undefined>(undefined)

  const videoAssets = useVideoAssets(projectId)

  // Derived client-side from the already-fetched list — no new aggregation
  // endpoint, same documented scale boundary as Asset Library's own
  // in-memory aggregation.
  const existingGroupIds = useMemo(() => {
    const ids = new Set<string>()
    for (const item of videoAssets.data?.items ?? []) ids.add(item.videoGroupId)
    return Array.from(ids)
  }, [videoAssets.data])

  const canGenerate = prompt.trim().length > 0

  const handleGenerate = () => {
    generateVideoAsset.mutate({
      projectId,
      kind,
      prompt: prompt.trim(),
      ...(videoGroupId === NEW_VIDEO_VALUE ? {} : { videoGroupId }),
      ...(brandKitId ? { brandKitId } : {}),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Video Asset</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='video-kind'>Artifact type</Label>

          <Select
            value={kind}
            onValueChange={(value) => setKind(value as VideoAssetKind)}
          >
            <SelectTrigger id='video-kind' className='w-full sm:w-64'>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Text</SelectLabel>
                {VIDEO_KIND_OPTIONS.filter((option) =>
                  TEXT_VIDEO_KINDS.includes(option.value)
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>

              <SelectGroup>
                <SelectLabel>Visual</SelectLabel>
                {VIDEO_KIND_OPTIONS.filter((option) =>
                  IMAGE_VIDEO_KINDS.includes(option.value)
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='video-group'>Video</Label>

          <Select value={videoGroupId} onValueChange={setVideoGroupId}>
            <SelectTrigger id='video-group' className='w-full sm:w-64'>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={NEW_VIDEO_VALUE}>Start a new video</SelectItem>
              {existingGroupIds.map((id) => (
                <SelectItem key={id} value={id}>
                  Video {id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='video-brand-kit'>Brand Kit (optional)</Label>

          <BrandKitSelect
            id='video-brand-kit'
            projectId={projectId}
            value={brandKitId}
            onValueChange={setBrandKitId}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='video-prompt'>Prompt</Label>

          <Textarea
            id='video-prompt'
            placeholder={`Describe the ${videoKindLabel(kind).toLowerCase()} you want to generate...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className='min-h-32'
          />
        </div>

        {generateVideoAsset.isError && (
          <p className='text-sm text-destructive'>
            {extractErrorMessage(generateVideoAsset.error)}
          </p>
        )}

        <Button
          className='w-full sm:w-auto'
          disabled={!canGenerate || generateVideoAsset.isPending}
          onClick={handleGenerate}
        >
          {generateVideoAsset.isPending ? 'Generating...' : 'Generate'}
        </Button>
      </CardContent>
    </Card>
  )
}
