import { afterEach, describe, expect, it } from 'vitest'
import type { SceneDefinition } from '@/features/presentation-engine/types/scene'
import { usePresentationStore } from './presentation-store'

function scene(id: string): SceneDefinition {
  return { id, module: 'test', title: id, route: '/app' }
}

afterEach(() => {
  usePresentationStore.getState().stop()
})

describe('presentation store', () => {
  it('start() loads scenes and resets to the first scene, status loading', () => {
    usePresentationStore.getState().start('pack-1', [scene('a'), scene('b')])
    const state = usePresentationStore.getState()

    expect(state.activeTourPackId).toBe('pack-1')
    expect(state.scenes).toHaveLength(2)
    expect(state.currentSceneIndex).toBe(0)
    expect(state.playbackStatus).toBe('loading')
  })

  it('next() advances the scene index and clears per-scene UI state', () => {
    usePresentationStore.getState().start('pack-1', [scene('a'), scene('b')])
    usePresentationStore.getState().setActiveTargets(['dashboard.quick-actions'])

    usePresentationStore.getState().next()
    const state = usePresentationStore.getState()

    expect(state.currentSceneIndex).toBe(1)
    expect(state.activeTargets).toEqual([])
    expect(state.playbackStatus).toBe('loading')
  })

  it('next() on the last scene completes the tour instead of overrunning', () => {
    usePresentationStore.getState().start('pack-1', [scene('a')])
    usePresentationStore.getState().next()

    expect(usePresentationStore.getState().playbackStatus).toBe('completed')
    expect(usePresentationStore.getState().currentSceneIndex).toBe(0)
  })

  it('prev() clamps at the first scene', () => {
    usePresentationStore.getState().start('pack-1', [scene('a'), scene('b')])
    usePresentationStore.getState().prev()
    expect(usePresentationStore.getState().currentSceneIndex).toBe(0)
  })

  it('seekToScene() clamps into range', () => {
    usePresentationStore.getState().start('pack-1', [scene('a'), scene('b'), scene('c')])

    usePresentationStore.getState().seekToScene(10)
    expect(usePresentationStore.getState().currentSceneIndex).toBe(2)

    usePresentationStore.getState().seekToScene(-5)
    expect(usePresentationStore.getState().currentSceneIndex).toBe(0)
  })

  it('play()/pause() only transition from valid states', () => {
    usePresentationStore.getState().start('pack-1', [scene('a')])

    usePresentationStore.getState().pause()
    expect(usePresentationStore.getState().playbackStatus).toBe('loading') // pause is a no-op unless playing

    usePresentationStore.getState().play()
    expect(usePresentationStore.getState().playbackStatus).toBe('playing')

    usePresentationStore.getState().pause()
    expect(usePresentationStore.getState().playbackStatus).toBe('paused')
  })

  it('toggleCaptions() persists across stop() (a user preference, not tour state)', () => {
    const initial = usePresentationStore.getState().captionsEnabled
    usePresentationStore.getState().toggleCaptions()
    expect(usePresentationStore.getState().captionsEnabled).toBe(!initial)

    usePresentationStore.getState().stop()
    expect(usePresentationStore.getState().captionsEnabled).toBe(!initial)
  })

  it('resolveInteraction() clears the awaiting flag and bumps the resolution token', () => {
    usePresentationStore.getState().setAwaitingInteraction(true, 'Click the button')
    expect(usePresentationStore.getState().isAwaitingUserInteraction).toBe(true)

    const tokenBefore = usePresentationStore.getState().interactionResolutionToken
    usePresentationStore.getState().resolveInteraction()

    expect(usePresentationStore.getState().isAwaitingUserInteraction).toBe(false)
    expect(usePresentationStore.getState().interactionPrompt).toBeNull()
    expect(usePresentationStore.getState().interactionResolutionToken).toBe(tokenBefore + 1)
  })
})
