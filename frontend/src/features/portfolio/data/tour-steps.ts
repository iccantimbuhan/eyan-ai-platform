import type { TourStep } from '../store/tour-store'

export const DEMO_VIDEO_URL = '/demo/sample-intro.mp4'
export const DEMO_VIDEO_FILENAME = 'sample-intro.mp4'

// Maps 1:1 to already-implemented FFmpeg operations (see
// FFmpegVideoProvider) — deliberately avoids blur_faces, auto_zoom,
// background_music and shorts, which the planner can propose but the
// execution engine does not yet implement.
export const DEMO_WORKFLOW_PROMPT =
  'Remove long pauses, normalize audio, slightly increase brightness, ' +
  'convert to portrait format, generate English subtitles, and burn ' +
  'subtitles into the final video.'

export interface TourStepCopy {
  step: TourStep
  label: string
  title: string
  description: string
}

export const TOUR_STEPS: TourStepCopy[] = [
  {
    step: 'upload',
    label: 'Step 1',
    title: 'Upload your introduction video',
    description:
      'EYAN Studio is uploading a bundled demo clip through the real Video Upload component — the same one every project uses.',
  },
  {
    step: 'plan',
    label: 'Step 2',
    title: 'AI plans the edit',
    description:
      'The Workflow Planner sends the request to the real AI planning pipeline, which returns a concrete list of FFmpeg operations.',
  },
  {
    step: 'execute',
    label: 'Step 3',
    title: 'FFmpeg + Faster Whisper execute the plan',
    description:
      'The Execution Engine trims, normalizes, resizes, transcribes, and burns in subtitles — all real processing, no mocked output.',
  },
  {
    step: 'review',
    label: 'Step 4',
    title: 'Review the result',
    description:
      'Compare the original upload against the processed video side by side in the real Review Workspace.',
  },
  {
    step: 'publish',
    label: 'Step 5',
    title: 'Ready for publishing',
    description:
      'Once approved, the asset is ready to publish through the real Publishing workflow.',
  },
]

export function tourStepCopy(step: TourStep): TourStepCopy | undefined {
  return TOUR_STEPS.find((s) => s.step === step)
}
