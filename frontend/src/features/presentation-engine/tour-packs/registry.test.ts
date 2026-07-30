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
})
