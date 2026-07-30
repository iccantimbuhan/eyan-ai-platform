import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { usePresentationStore } from '@/stores/presentation-store'
import { usePresentationKeyboardShortcuts } from '../hooks/use-presentation-keyboard-shortcuts'
import { usePresentationRunner } from '../hooks/use-presentation-runner'
import { PlaybackControls } from './PlaybackControls'
import { ProgressIndicator } from './ProgressIndicator'
import { SpotlightLayer } from './SpotlightLayer'

/**
 * The Presentation Engine's only new UI. Mounted once, root-level,
 * sibling to <Toaster> in __root.tsx — never per-route, never per-
 * feature. Deliberately not a Dialog (same reasoning as the portfolio
 * tour's TourOverlay): the real application must stay visible and
 * interactive behind it.
 */
export function PresentationOverlayRoot() {
  usePresentationRunner()

  const playbackStatus = usePresentationStore((s) => s.playbackStatus)
  const scenes = usePresentationStore((s) => s.scenes)
  const currentSceneIndex = usePresentationStore((s) => s.currentSceneIndex)
  const elapsedMsInScene = usePresentationStore((s) => s.elapsedMsInScene)
  const speed = usePresentationStore((s) => s.speed)
  const captionsEnabled = usePresentationStore((s) => s.captionsEnabled)
  const activeSubtitleText = usePresentationStore((s) => s.activeSubtitleText)
  const isAwaitingUserInteraction = usePresentationStore((s) => s.isAwaitingUserInteraction)
  const interactionPrompt = usePresentationStore((s) => s.interactionPrompt)
  const error = usePresentationStore((s) => s.error)

  const reducedMotion = useReducedMotion()
  const isActive = playbackStatus !== 'idle'

  const exit = React.useCallback(() => usePresentationStore.getState().stop(), [])
  usePresentationKeyboardShortcuts(isActive, exit)

  if (!isActive) return null

  const scene = scenes[currentSceneIndex]
  const transitionClassName = reducedMotion ? '' : 'animate-in fade-in-0 slide-in-from-bottom-4'

  return (
    <>
      <SpotlightLayer />

      {captionsEnabled && activeSubtitleText && (
        <div
          className='pointer-events-none fixed inset-x-4 bottom-28 flex justify-center sm:bottom-24'
          style={{ zIndex: 'var(--z-presentation)' }}
        >
          <p className='max-w-xl rounded-md bg-black/80 px-4 py-2 text-center text-sm text-white shadow-lg'>
            {activeSubtitleText}
          </p>
        </div>
      )}

      <div
        className={`fixed inset-x-4 bottom-4 sm:inset-x-auto sm:end-4 sm:w-96 ${transitionClassName}`}
        style={{ zIndex: 'var(--z-presentation)' }}
      >
        <Card className='bg-background/95 shadow-lg backdrop-blur'>
          <CardHeader className='space-y-2'>
            <p className='text-xs font-medium text-primary'>Presentation</p>
            <CardTitle>{scene?.title ?? 'Loading…'}</CardTitle>
          </CardHeader>

          <CardContent className='space-y-3'>
            {error ? (
              <p className='text-sm text-destructive'>{error}</p>
            ) : (
              <p className='text-sm text-muted-foreground'>{scene?.narration?.text}</p>
            )}

            {isAwaitingUserInteraction && interactionPrompt && (
              <p className='rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground'>
                {interactionPrompt}
              </p>
            )}

            <ProgressIndicator scenes={scenes} currentSceneIndex={currentSceneIndex} elapsedMsInScene={elapsedMsInScene} />

            <PlaybackControls
              playbackStatus={playbackStatus}
              speed={speed}
              captionsEnabled={captionsEnabled}
              canGoPrev={currentSceneIndex > 0}
              onPlay={() => usePresentationStore.getState().play()}
              onPause={() => usePresentationStore.getState().pause()}
              onRestart={() => usePresentationStore.getState().restart()}
              onPrev={() => usePresentationStore.getState().prev()}
              onNext={() => usePresentationStore.getState().next()}
              onSpeedChange={(next) => usePresentationStore.getState().setSpeed(next)}
              onToggleCaptions={() => usePresentationStore.getState().toggleCaptions()}
              onExit={exit}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
