import type { SceneDefinition, TimelineStep } from '../types/scene'

export const DEFAULT_SCENE_DURATION_MS = 4000

/**
 * Scenes stay data-driven and ergonomic: authors only need to fill in
 * `camera`/`highlight`/`narration` and the engine synthesizes the beat
 * sequence. `timeline` remains the explicit escape valve for multi-beat
 * scenes that need finer control.
 */
export function buildTimeline(scene: SceneDefinition): TimelineStep[] {
  if (scene.timeline && scene.timeline.length > 0) return scene.timeline

  const steps: TimelineStep[] = []
  if (scene.camera) steps.push({ kind: 'camera', camera: scene.camera })
  if (scene.highlight) steps.push({ kind: 'highlight', highlight: scene.highlight })
  if (scene.narration) steps.push({ kind: 'narrate', narration: scene.narration })
  return steps
}

/** The floor scene duration once narration (if any) has finished playing. */
export function computeSceneDurationMs(scene: SceneDefinition, narrationDurationMs = 0): number {
  return Math.max(scene.duration ?? 0, narrationDurationMs, DEFAULT_SCENE_DURATION_MS)
}

export function totalTourDurationMs(scenes: SceneDefinition[]): number {
  return scenes.reduce((sum, scene) => sum + computeSceneDurationMs(scene), 0)
}

/** Cumulative duration elapsed *before* each scene starts — used for the progress bar. */
export function cumulativeDurationsMs(scenes: SceneDefinition[]): number[] {
  const cumulative: number[] = []
  let running = 0
  for (const scene of scenes) {
    cumulative.push(running)
    running += computeSceneDurationMs(scene)
  }
  return cumulative
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A pausable, speed-aware delay: ticks down `ms` of *scene* time, but only
 * while playback is 'playing', and scaled by the current speed multiplier.
 * Used for 'wait' timeline steps and for topping a scene up to its
 * authored/narration-derived duration.
 */
export async function pausableDelay(
  ms: number,
  opts: {
    signal: AbortSignal
    getStatus: () => string
    getSpeed: () => number
    onTick?: (deltaMs: number) => void
  }
): Promise<void> {
  const tickMs = 100
  let remaining = ms

  while (remaining > 0) {
    if (opts.signal.aborted) throw new DOMException('Presentation scene aborted', 'AbortError')

    if (opts.getStatus() === 'playing') {
      const step = Math.min(tickMs, remaining)
      await sleep(step)
      const scaled = step * opts.getSpeed()
      remaining -= scaled
      opts.onTick?.(scaled)
    } else {
      await sleep(tickMs)
    }
  }
}
