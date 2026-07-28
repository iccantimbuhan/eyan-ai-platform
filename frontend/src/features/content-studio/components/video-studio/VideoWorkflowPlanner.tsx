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

import { useVideoAssets } from '../../hooks/use-video-assets'
import type { usePlanVideoWorkflow } from '../../hooks/use-plan-video-workflow'
import { isVideoFileKind } from '../../types/video-asset'
import type { WorkflowOperation } from '../../api/video-workflow-planner.api'

interface VideoWorkflowPlannerProps {
  projectId: string
  planWorkflow: ReturnType<typeof usePlanVideoWorkflow>
}

const OPERATION_LABELS: Record<WorkflowOperation, string> = {
  trim: 'Trim',
  remove_silence: 'Remove Silence',
  normalize_audio: 'Normalize Audio',
  resize: 'Resize',
  shorts: 'Convert to Shorts',
  subtitles: 'Subtitles',
  blur_faces: 'Blur Faces',
  auto_zoom: 'Auto Zoom',
  brightness: 'Brightness',
  background_music: 'Background Music',
}

function operationLabel(operation: string): string {
  return OPERATION_LABELS[operation as WorkflowOperation] ?? operation
}

// Same reasoning as VideoGenerateForm/VideoSourceUpload's own
// extractErrorMessage: the backend already sanitizes planning failures
// (missing source, malformed/invalid AI output after the retry) into a
// safe message before they reach the API response — see
// VideoWorkflowPlannerService.
function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { error?: string } | undefined)?.error

    if (serverMessage) return serverMessage
  }

  return 'Failed to generate a workflow plan. Please try again.'
}

export function VideoWorkflowPlanner({ projectId, planWorkflow }: VideoWorkflowPlannerProps) {
  const videoAssets = useVideoAssets(projectId)
  const sources = (videoAssets.data?.items ?? []).filter((asset) =>
    isVideoFileKind(asset.kind)
  )

  const [videoAssetId, setVideoAssetId] = useState<string>('')
  const [prompt, setPrompt] = useState('')

  const canGenerate = videoAssetId.length > 0 && prompt.trim().length > 0

  const handleGenerate = () => {
    planWorkflow.mutate({ videoAssetId, prompt: prompt.trim() })
  }

  const plan = planWorkflow.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan an Edit</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='workflow-source'>Source video</Label>

          <Select value={videoAssetId} onValueChange={setVideoAssetId}>
            <SelectTrigger id='workflow-source' className='w-full sm:w-64'>
              <SelectValue placeholder='Choose an uploaded video' />
            </SelectTrigger>

            <SelectContent>
              {sources.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.sourceFileName ?? asset.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='workflow-prompt'>Describe the edit</Label>

          <Textarea
            id='workflow-prompt'
            placeholder='Remove silence, make it vertical, add subtitles and normalize the audio.'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className='min-h-24'
          />
        </div>

        {planWorkflow.isError && (
          <p className='text-sm text-destructive'>{extractErrorMessage(planWorkflow.error)}</p>
        )}

        <Button
          className='w-full sm:w-auto'
          disabled={!canGenerate || planWorkflow.isPending}
          onClick={handleGenerate}
        >
          {planWorkflow.isPending ? 'Generating plan...' : 'Generate Plan'}
        </Button>

        {plan && (
          <div className='space-y-2 rounded-md border p-3'>
            <p className='text-sm font-medium'>Plan preview</p>

            <ol className='list-decimal space-y-2 pl-5 text-sm'>
              {plan.workflow.steps.map((step, index) => (
                <li key={index}>
                  <span className='font-medium'>{operationLabel(step.operation)}</span>
                  {Object.keys(step.params).length > 0 && (
                    <span className='text-muted-foreground'>
                      {' — '}
                      {Object.entries(step.params)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
