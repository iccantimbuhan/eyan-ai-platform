import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { operationLabel } from '@/features/content-studio/components/video-studio/workflow-operation-labels'
import type { WorkflowStep } from '@/features/content-studio/api/video-workflow-planner.api'

import { tourStepCopy } from '../data/tour-steps'
import type { TourStep } from '../store/tour-store'
import { StepIndicator } from './StepIndicator'

interface TourOverlayProps {
  step: TourStep
  error: string | null
  uploadPending: boolean
  planPending: boolean
  executePending: boolean
  planSteps?: WorkflowStep[]
  reviewIsPending: boolean
  onContinueToPublish: () => void
  onFinishTour: () => void
}

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0)

  // Reset during render when `active` flips off (React's documented
  // pattern for adjusting state from a prop change) — the effect below
  // only ever calls setSeconds from the interval callback, the canonical
  // "subscribe to an external timer" case.
  const [prevActive, setPrevActive] = useState(active)
  if (active !== prevActive) {
    setPrevActive(active)
    if (!active) setSeconds(0)
  }

  useEffect(() => {
    if (!active) return

    const start = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [active])

  return seconds
}

function StatusLine({
  step,
  uploadPending,
  planPending,
  executePending,
  planSteps,
}: {
  step: TourStep
  uploadPending: boolean
  planPending: boolean
  executePending: boolean
  planSteps?: WorkflowStep[]
}) {
  const elapsed = useElapsedSeconds(executePending)

  if (step === 'upload' && uploadPending) {
    return <p className='text-sm text-muted-foreground'>Uploading the demo clip…</p>
  }

  if (step === 'plan' && planPending) {
    return <p className='text-sm text-muted-foreground'>Waiting on the AI workflow planner…</p>
  }

  if (step === 'execute') {
    return (
      <div className='space-y-2 text-sm text-muted-foreground'>
        <p>
          Running the real pipeline now — FFmpeg and Faster Whisper, no mocked output. This can
          take up to a minute.
        </p>
        {planSteps && planSteps.length > 0 && (
          <ol className='list-decimal space-y-0.5 pl-4'>
            {planSteps.map((s, i) => (
              <li key={i}>{operationLabel(s.operation)}</li>
            ))}
          </ol>
        )}
        {executePending && (
          <p className='flex items-center gap-1.5 font-medium text-foreground'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' /> Elapsed: {elapsed}s
          </p>
        )}
      </div>
    )
  }

  return null
}

// Floating, non-modal panel — deliberately not a Dialog, since the whole
// point is to keep the real Content Studio UI behind it visible and
// interactive while the tour narrates what's happening.
export function TourOverlay({
  step,
  error,
  uploadPending,
  planPending,
  executePending,
  planSteps,
  reviewIsPending,
  onContinueToPublish,
  onFinishTour,
}: TourOverlayProps) {
  if (step === 'idle' || step === 'starting' || step === 'recap') return null

  if (step === 'error') {
    return (
      <div className='animate-in fade-in-0 slide-in-from-bottom-4 fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-96'>
        <Card className='border-destructive/50 bg-background/95 shadow-lg backdrop-blur'>
          <CardHeader>
            <CardTitle className='text-destructive'>Tour interrupted</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-muted-foreground'>{error}</p>
            <Button asChild variant='outline' className='w-full'>
              <Link to='/'>Back to Portfolio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const copy = tourStepCopy(step)
  if (!copy) return null

  return (
    <div className='animate-in fade-in-0 slide-in-from-bottom-4 fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-96'>
      <Card className='bg-background/95 shadow-lg backdrop-blur'>
        <CardHeader className='space-y-3'>
          <StepIndicator currentStep={step} />
          <div>
            <p className='text-xs font-medium text-primary'>{copy.label}</p>
            <CardTitle>{copy.title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>{copy.description}</p>

          <StatusLine
            step={step}
            uploadPending={uploadPending}
            planPending={planPending}
            executePending={executePending}
            planSteps={planSteps}
          />

          {step === 'review' && (
            <Button className='w-full' onClick={onContinueToPublish} disabled={reviewIsPending}>
              {reviewIsPending ? 'Marking ready…' : 'Continue to Publishing'}
            </Button>
          )}

          {step === 'publish' && (
            <Button asChild className='w-full' onClick={onFinishTour}>
              <Link to='/'>Finish Tour</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
