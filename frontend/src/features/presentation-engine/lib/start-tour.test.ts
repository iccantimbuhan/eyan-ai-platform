import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePresentationStore } from '@/stores/presentation-store'
import { startTourPack } from './start-tour'

afterEach(() => {
  usePresentationStore.getState().stop()
})

describe('startTourPack', () => {
  it('loads the pack into the store and navigates to the first scene route', () => {
    const navigate = vi.fn()

    const started = startTourPack('platform-overview', navigate)

    expect(started).toBe(true)
    expect(usePresentationStore.getState().activeTourPackId).toBe('platform-overview')
    expect(usePresentationStore.getState().scenes[0].id).toBe('dashboard.welcome')
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/app' }))
  })

  it('returns false and never navigates for an unknown pack id', () => {
    const navigate = vi.fn()

    const started = startTourPack('does-not-exist', navigate)

    expect(started).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect(usePresentationStore.getState().activeTourPackId).toBeNull()
  })

  it('starts the recruiter-tour used by the public homepage CTA', () => {
    const navigate = vi.fn()

    const started = startTourPack('recruiter-tour', navigate)

    expect(started).toBe(true)
    expect(usePresentationStore.getState().scenes.map((s) => s.id)[0]).toBe('dashboard.welcome')
  })
})
