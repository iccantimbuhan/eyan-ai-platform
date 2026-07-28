import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOUR_STEPS } from '../data/tour-steps'
import type { TourStep } from '../store/tour-store'

interface StepIndicatorProps {
  currentStep: TourStep
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = TOUR_STEPS.findIndex((s) => s.step === currentStep)

  return (
    <div className='flex items-center gap-2'>
      {TOUR_STEPS.map((s, index) => {
        const isDone = currentIndex > index || currentStep === 'recap'
        const isCurrent = s.step === currentStep

        return (
          <div
            key={s.step}
            title={s.title}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
              isDone && 'bg-primary text-primary-foreground',
              isCurrent && 'bg-primary/15 text-primary ring-2 ring-primary',
              !isDone && !isCurrent && 'bg-muted text-muted-foreground'
            )}
          >
            {isDone ? <Check className='h-3.5 w-3.5' /> : index + 1}
          </div>
        )
      })}
    </div>
  )
}
