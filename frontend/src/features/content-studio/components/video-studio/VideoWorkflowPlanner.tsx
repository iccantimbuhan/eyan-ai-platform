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
import { operationLabel } from './workflow-operation-labels'

interface VideoWorkflowPlannerProps {
  projectId: string
  planWorkflow: ReturnType<typeof usePlanVideoWorkflow>
  // Lets an external orchestrator (the portfolio guided tour) pre-fill the
  // form so its own trigger of the same planWorkflow mutation shows up
  // here exactly as a manual fill-and-click would.
  initialVideoAssetId?: string
  initialPrompt?: string
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

export function VideoWorkflowPlanner({
  projectId,
  planWorkflow,
  initialVideoAssetId,
  initialPrompt,
}: VideoWorkflowPlannerProps) {
  const videoAssets = useVideoAssets(projectId)
  const sources = (videoAssets.data?.items ?? []).filter((asset) =>
    isVideoFileKind(asset.kind)
  )

  const [videoAssetId, setVideoAssetId] = useState<string>('')
  const [prompt, setPrompt] = useState('')

  // Adjust state from props during render (React's documented pattern for
  // this) rather than in an effect: initialVideoAssetId/initialPrompt only
  // become known after the tour's upload step finishes, so this seeds the
  // form the moment that happens without an extra render round-trip. The
  // sentinel state starts at null — a value neither prop can ever equal —
  // so this also correctly applies a value that's already present on the
  // very first render (initialPrompt is set from mount), not just later
  // changes. Must be useState, not useRef: refs can't be read or written
  // during render (react-hooks/refs).
  const [appliedVideoAssetId, setAppliedVideoAssetId] = useState<string | null>(null)
  if (initialVideoAssetId && initialVideoAssetId !== appliedVideoAssetId) {
    setAppliedVideoAssetId(initialVideoAssetId)
    setVideoAssetId(initialVideoAssetId)
  }

  const [appliedPrompt, setAppliedPrompt] = useState<string | null>(null)
  if (initialPrompt && initialPrompt !== appliedPrompt) {
    setAppliedPrompt(initialPrompt)
    setPrompt(initialPrompt)
  }

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
