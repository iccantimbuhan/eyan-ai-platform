import { Captions, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PlaybackSpeed, PlaybackStatus } from '@/stores/presentation-store'

const SPEED_CYCLE: PlaybackSpeed[] = [1, 1.25, 1.5, 2]

interface PlaybackControlsProps {
  playbackStatus: PlaybackStatus
  speed: PlaybackSpeed
  captionsEnabled: boolean
  canGoPrev: boolean
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onPrev: () => void
  onNext: () => void
  onSpeedChange: (speed: PlaybackSpeed) => void
  onToggleCaptions: () => void
  onExit: () => void
}

export function PlaybackControls({
  playbackStatus,
  speed,
  captionsEnabled,
  canGoPrev,
  onPlay,
  onPause,
  onRestart,
  onPrev,
  onNext,
  onSpeedChange,
  onToggleCaptions,
  onExit,
}: PlaybackControlsProps) {
  const isPlaying = playbackStatus === 'playing'

  const cycleSpeed = () => {
    const currentIndex = SPEED_CYCLE.indexOf(speed)
    onSpeedChange(SPEED_CYCLE[(currentIndex + 1) % SPEED_CYCLE.length])
  }

  return (
    <div className='flex items-center justify-between gap-1'>
      <div className='flex items-center gap-1'>
        <Button variant='ghost' size='icon' aria-label='Restart tour' onClick={onRestart}>
          <RotateCcw />
        </Button>
        <Button variant='ghost' size='icon' aria-label='Previous scene' onClick={onPrev} disabled={!canGoPrev}>
          <SkipBack />
        </Button>
        <Button
          variant='default'
          size='icon'
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button variant='ghost' size='icon' aria-label='Next scene' onClick={onNext}>
          <SkipForward />
        </Button>
      </div>

      <div className='flex items-center gap-1'>
        <Button variant='ghost' size='sm' aria-label='Playback speed' onClick={cycleSpeed}>
          {speed}x
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label={captionsEnabled ? 'Hide captions' : 'Show captions'}
          aria-pressed={captionsEnabled}
          onClick={onToggleCaptions}
          className={cn(!captionsEnabled && 'text-muted-foreground')}
        >
          <Captions />
        </Button>
        <Button variant='ghost' size='icon' aria-label='Exit presentation' onClick={onExit}>
          <X />
        </Button>
      </div>
    </div>
  )
}
