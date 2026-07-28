import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  FileVideo,
  Gauge,
  ListChecks,
  Rocket,
  Sparkles,
  UploadCloud,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const PIPELINE = [
  { icon: UploadCloud, label: 'Video Upload' },
  { icon: FileVideo, label: 'Metadata Extraction' },
  { icon: Wand2, label: 'AI Planning' },
  { icon: Gauge, label: 'Workflow Execution' },
  { icon: Sparkles, label: 'Subtitle Generation' },
  { icon: ListChecks, label: 'Review' },
  { icon: Rocket, label: 'Publishing' },
]

export function TourRecap() {
  return (
    <section className='space-y-8 text-center'>
      <div className='space-y-3'>
        <p className='text-sm font-medium text-primary'>Tour complete</p>
        <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>What You Just Saw</h1>
        <p className='mx-auto max-w-2xl text-muted-foreground'>
          Every step ran against the real EYAN Studio application — the same upload component,
          the same AI planner, the same FFmpeg and Faster Whisper pipeline a real project uses.
        </p>
      </div>

      <div className='mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-4'>
        {PIPELINE.map(({ icon: Icon, label }, index) => (
          <div key={label} className='flex items-center gap-2'>
            <div className='flex flex-col items-center gap-2 rounded-lg border bg-card px-4 py-3'>
              <Icon className='h-5 w-5 text-primary' />
              <span className='text-xs font-medium'>{label}</span>
            </div>
            {index < PIPELINE.length - 1 && (
              <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground' />
            )}
          </div>
        ))}
      </div>

      <Button asChild size='lg'>
        <Link to='/'>Back to Portfolio</Link>
      </Button>
    </section>
  )
}
