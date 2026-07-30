import type { NarrationProviderId, SceneDefinition } from './scene'

export interface SceneRef {
  sceneId: string
  /** Lets a Tour Pack reuse a shared scene with a different narration/pacing for its audience. */
  overrides?: Partial<Pick<SceneDefinition, 'narration' | 'subtitles' | 'duration'>>
}

export type TourAudience =
  | 'recruiter'
  | 'customer'
  | 'investor'
  | 'training'
  | 'feature'
  | 'admin'
  | (string & {})

/**
 * A Tour Pack is pure data — an ordered playlist of scene references plus
 * presentation-level metadata. It contains zero engine logic; two Tour
 * Packs can share the same underlying scenes in a different order or with
 * different narration overrides.
 */
export interface TourPack {
  id: string
  title: string
  audience: TourAudience
  description: string
  defaultNarrationProviderId: NarrationProviderId
  scenes: SceneRef[]
  metadata?: {
    estimatedDurationMs?: number
    tags?: string[]
    /** Gates whether this pack appears in the launcher, via useCan(). */
    permission?: string
  }
}
