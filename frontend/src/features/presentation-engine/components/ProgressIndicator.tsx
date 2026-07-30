import { cumulativeDurationsMs, computeSceneDurationMs, totalTourDurationMs } from '../engine/timeline-engine'
import type { SceneDefinition } from '../types/scene'

interface ProgressIndicatorProps {
  scenes: SceneDefinition[]
  currentSceneIndex: number
  elapsedMsInScene: number
}

/**
 * A slim, continuous progress bar (Stripe/Linear-style) rather than a
 * fixed row of step dots — dots don't scale once a Tour Pack grows past
 * a handful of scenes, and this generalizes to any scene count for free.
 */
export function ProgressIndicator({ scenes, currentSceneIndex, elapsedMsInScene }: ProgressIndicatorProps) {
  const total = totalTourDurationMs(scenes)
  const cumulative = cumulativeDurationsMs(scenes)
  const currentScene = scenes[currentSceneIndex]
  const sceneFloor = currentScene ? computeSceneDurationMs(currentScene) : 0
  const elapsedTotal = (cumulative[currentSceneIndex] ?? 0) + Math.min(elapsedMsInScene, sceneFloor)
  const progress = total > 0 ? Math.min(1, elapsedTotal / total) : 0

  return (
    <div className='space-y-1.5'>
      <div className='h-1 w-full overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary transition-[width] duration-200 ease-linear'
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className='text-xs text-muted-foreground'>
        Scene {Math.min(currentSceneIndex + 1, scenes.length)} of {scenes.length}
      </p>
    </div>
  )
}
