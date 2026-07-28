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
import { formatDurationMs } from '@/lib/utils'

import { resolveStoredFileUrl } from '../../api/images.api'
import { useVideoWorkflowPlans } from '../../hooks/use-video-workflow-plans'
import { useVideoAssets } from '../../hooks/use-video-assets'
import type { useExecuteWorkflow } from '../../hooks/use-execute-workflow'

interface VideoWorkflowExecutorProps {
  projectId: string
  executeWorkflow: ReturnType<typeof useExecuteWorkflow>
  // Lets an external orchestrator (the portfolio guided tour) pre-select
  // the just-generated plan so its own trigger of the same executeWorkflow
  // mutation shows up here exactly as a manual selection would.
  initialWorkflowPlanId?: string
}

// Same reasoning as this feature's other extractErrorMessage helpers: the
// backend already sanitizes execution failures (unsupported operation,
// missing source, an ffmpeg step failing) into a safe message before they
// reach the API response — see VideoExecutionEngineService.
function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { error?: string } | undefined)?.error

    if (serverMessage) return serverMessage
  }

  return 'Failed to execute the workflow. Please try again.'
}

export function VideoWorkflowExecutor({
  projectId,
  executeWorkflow,
  initialWorkflowPlanId,
}: VideoWorkflowExecutorProps) {
  const plans = useVideoWorkflowPlans(projectId)
  const videoAssets = useVideoAssets(projectId)

  const [workflowPlanId, setWorkflowPlanId] = useState('')

  // Adjust state from the prop during render (React's documented pattern
  // for this) rather than in an effect: initialWorkflowPlanId only becomes
  // known after the tour's planning step finishes. The sentinel state
  // starts at null — a value the prop can never equal — so this also
  // correctly applies a value that's already present on the very first
  // render, not just later changes. Must be useState, not useRef: refs
  // can't be read or written during render (react-hooks/refs).
  const [appliedWorkflowPlanId, setAppliedWorkflowPlanId] = useState<string | null>(null)
  if (initialWorkflowPlanId && initialWorkflowPlanId !== appliedWorkflowPlanId) {
    setAppliedWorkflowPlanId(initialWorkflowPlanId)
    setWorkflowPlanId(initialWorkflowPlanId)
  }

  const sourceFileName = (videoAssetId: string) =>
    videoAssets.data?.items.find((asset) => asset.id === videoAssetId)?.sourceFileName ??
    videoAssetId

  const canExecute = workflowPlanId.length > 0 && !executeWorkflow.isPending

  const handleExecute = () => {
    executeWorkflow.mutate({ workflowPlanId })
  }

  const edited = executeWorkflow.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execute a Workflow</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='execute-plan'>Workflow</Label>

          <Select value={workflowPlanId} onValueChange={setWorkflowPlanId}>
            <SelectTrigger id='execute-plan' className='w-full sm:w-96'>
              <SelectValue placeholder='Choose a generated workflow plan' />
            </SelectTrigger>

            <SelectContent>
              {(plans.data ?? []).map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {sourceFileName(plan.videoAssetId)} — {plan.prompt.slice(0, 60)}
                  {plan.executedAt ? ' (already executed)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {executeWorkflow.isError && (
          <p className='text-sm text-destructive'>{extractErrorMessage(executeWorkflow.error)}</p>
        )}

        <Button
          className='w-full sm:w-auto'
          disabled={!canExecute}
          onClick={handleExecute}
        >
          {executeWorkflow.isPending ? 'Executing...' : 'Execute Workflow'}
        </Button>

        {edited && (
          <div className='space-y-2 rounded-md border p-3'>
            <video
              controls
              className='w-full max-w-sm rounded-md border'
              src={edited.storagePath ? resolveStoredFileUrl(edited.storagePath) : undefined}
            />
            <div className='text-sm text-muted-foreground'>
              <p>{edited.sourceFileName}</p>
              <p>
                {edited.width}×{edited.height} · {formatDurationMs(edited.durationMs)} ·{' '}
                {edited.videoFormat}
              </p>
              <p>
                Subtitles:{' '}
                {edited.subtitlePath ? (
                  <a
                    className='underline'
                    href={resolveStoredFileUrl(edited.subtitlePath)}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Generated — preview .srt
                  </a>
                ) : (
                  'None'
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
