import { describe, expect, it } from 'vitest'
import { resolveTourPackScenes, TOUR_PACKS } from './registry'
import type { TourPack } from '../types/tour-pack'

describe('resolveTourPackScenes', () => {
  it('resolves the platform-overview tour to real, ordered scene definitions', () => {
    const pack = TOUR_PACKS['platform-overview']
    const scenes = resolveTourPackScenes(pack)

    expect(scenes.map((s) => s.id)).toEqual([
      'dashboard.welcome',
      'dashboard.quick-actions',
      'dashboard.platform-stats',
      'ai-chat.overview',
      'ai-chat.compose',
    ])
  })

  it('applies per-reference overrides without mutating the shared scene', () => {
    const pack: TourPack = {
      id: 'test-pack',
      title: 'Test',
      audience: 'feature',
      description: '',
      defaultNarrationProviderId: 'pre-recorded',
      scenes: [{ sceneId: 'dashboard.welcome', overrides: { duration: 999 } }],
    }

    const [scene] = resolveTourPackScenes(pack)
    expect(scene.duration).toBe(999)

    const [unmodified] = resolveTourPackScenes(TOUR_PACKS['platform-overview'])
    expect(unmodified.duration).not.toBe(999)
  })

  it('drops references to unknown scene ids instead of throwing', () => {
    const pack: TourPack = {
      id: 'test-pack-2',
      title: 'Test',
      audience: 'feature',
      description: '',
      defaultNarrationProviderId: 'pre-recorded',
      scenes: [{ sceneId: 'dashboard.welcome' }, { sceneId: 'does-not-exist' }],
    }

    expect(resolveTourPackScenes(pack).map((s) => s.id)).toEqual(['dashboard.welcome'])
  })

  it('resolves the ai-content-studio tour to real, ordered scene definitions', () => {
    const scenes = resolveTourPackScenes(TOUR_PACKS['ai-content-studio'])
    expect(scenes.map((s) => s.id)).toEqual([
      'content-studio.overview',
      'content-studio.new-project',
      'content-studio.pipeline',
      'content-studio.dashboard-stats',
      'content-studio.dashboard-activity',
      'content-studio.prompt-library',
    ])
  })

  it('registers every Tour Pack with zero dangling scene references', () => {
    // Guards against a typo'd sceneId silently dropping a scene from a
    // curated pack like Recruiter/Customer Tour, which spans three
    // separate scene files.
    for (const pack of Object.values(TOUR_PACKS)) {
      const resolved = resolveTourPackScenes(pack)
      expect(resolved, `Tour pack "${pack.id}" has a dangling scene reference`).toHaveLength(
        pack.scenes.length
      )
    }
  })

  it('registers the expected set of Tour Packs for the Presentation Library', () => {
    expect(Object.keys(TOUR_PACKS).sort()).toEqual(
      ['platform-overview', 'ai-content-studio', 'recruiter-tour', 'customer-tour'].sort()
    )
  })
})
