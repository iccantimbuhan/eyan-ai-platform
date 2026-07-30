import { describe, expect, it } from 'vitest'
import type { SceneDefinition } from '../types/scene'
import {
  buildTimeline,
  computeSceneDurationMs,
  cumulativeDurationsMs,
  DEFAULT_SCENE_DURATION_MS,
  pausableDelay,
  totalTourDurationMs,
} from './timeline-engine'

function baseScene(overrides: Partial<SceneDefinition> = {}): SceneDefinition {
  return {
    id: 'test.scene',
    module: 'test',
    title: 'Test Scene',
    route: '/app',
    ...overrides,
  }
}

describe('buildTimeline', () => {
  it('returns the explicit timeline verbatim when authored', () => {
    const scene = baseScene({ timeline: [{ kind: 'wait', ms: 100 }] })
    expect(buildTimeline(scene)).toEqual([{ kind: 'wait', ms: 100 }])
  })

  it('synthesizes camera -> highlight -> narrate from scene fields, in that order', () => {
    const scene = baseScene({
      camera: { target: 'a' },
      highlight: { target: 'b' },
      narration: { text: 'hello' },
    })
    const steps = buildTimeline(scene)
    expect(steps.map((s) => s.kind)).toEqual(['camera', 'highlight', 'narrate'])
  })

  it('omits steps for fields the scene does not set', () => {
    const scene = baseScene({ narration: { text: 'hello' } })
    expect(buildTimeline(scene)).toEqual([{ kind: 'narrate', narration: { text: 'hello' } }])
  })
})

describe('computeSceneDurationMs', () => {
  it('falls back to the default floor when nothing is authored', () => {
    expect(computeSceneDurationMs(baseScene())).toBe(DEFAULT_SCENE_DURATION_MS)
  })

  it('uses the authored duration when it exceeds the default', () => {
    expect(computeSceneDurationMs(baseScene({ duration: 9000 }))).toBe(9000)
  })

  it('uses narration duration when it exceeds both the authored duration and default', () => {
    expect(computeSceneDurationMs(baseScene({ duration: 2000 }), 7000)).toBe(7000)
  })
})

describe('totalTourDurationMs / cumulativeDurationsMs', () => {
  it('sums per-scene floor durations and tracks cumulative offsets', () => {
    // Both durations exceed DEFAULT_SCENE_DURATION_MS so the floor never kicks in here.
    const scenes = [baseScene({ duration: 5000 }), baseScene({ duration: 6000 })]
    expect(totalTourDurationMs(scenes)).toBe(11000)
    expect(cumulativeDurationsMs(scenes)).toEqual([0, 5000])
  })

  it('applies the default floor to scenes with a shorter authored duration', () => {
    const scenes = [baseScene({ duration: 1000 }), baseScene({ duration: 500 })]
    expect(totalTourDurationMs(scenes)).toBe(DEFAULT_SCENE_DURATION_MS * 2)
  })
})

describe('pausableDelay', () => {
  it('resolves after the requested duration while playing', async () => {
    let elapsed = 0
    await pausableDelay(300, {
      signal: new AbortController().signal,
      getStatus: () => 'playing',
      getSpeed: () => 1,
      onTick: (delta) => {
        elapsed += delta
      },
    })
    expect(elapsed).toBeGreaterThanOrEqual(300)
  })

  it('scales elapsed time by the speed multiplier', async () => {
    let elapsed = 0
    await pausableDelay(200, {
      signal: new AbortController().signal,
      getStatus: () => 'playing',
      getSpeed: () => 2,
      onTick: (delta) => {
        elapsed += delta
      },
    })
    // At 2x speed, ~200ms of authored duration passes in ~100ms of wall-clock ticks.
    expect(elapsed).toBeGreaterThanOrEqual(200)
  })

  it('rejects with an AbortError once the signal aborts', async () => {
    const controller = new AbortController()
    const promise = pausableDelay(5000, {
      signal: controller.signal,
      getStatus: () => 'playing',
      getSpeed: () => 1,
    })
    controller.abort()
    await expect(promise).rejects.toThrow('Presentation scene aborted')
  })

  it('does not consume remaining time while paused', async () => {
    let ticks = 0
    const controller = new AbortController()
    const promise = pausableDelay(1000, {
      signal: controller.signal,
      getStatus: () => 'paused',
      getSpeed: () => 1,
      onTick: () => {
        ticks += 1
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 250))
    controller.abort()
    await expect(promise).rejects.toThrow()
    expect(ticks).toBe(0)
  })
})
