import type { LinkProps } from '@tanstack/react-router'

/** Same "typed route or arbitrary string" escape hatch already used by NavItem.url in layout/types.ts. */
export type SceneRoute = LinkProps['to'] | (string & {})

export type NarrationProviderId =
  | 'pre-recorded'
  | 'openai'
  | 'elevenlabs'
  | 'google'
  | 'azure'
  | 'local'
  | (string & {})

export interface SubtitleCue {
  text: string
  startMs: number
  endMs: number
}

export interface SceneNarration {
  text: string
  providerId?: NarrationProviderId
  audioAsset?: string
}

export interface SceneCamera {
  target: string | string[]
  padding?: number
  behavior?: 'smooth' | 'instant'
}

export interface SceneHighlight {
  target: string | string[]
  style?: 'spotlight' | 'glow' | 'focus-ring'
  callout?: {
    text: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }
}

export interface SceneInteractivePause {
  prompt: string
  resumeOn: 'timeout' | 'target-interaction' | 'manual-next'
  timeoutMs?: number
}

export type TimelineStep =
  | { kind: 'camera'; camera: SceneCamera; atMs?: number }
  | { kind: 'highlight'; highlight: SceneHighlight; atMs?: number; durationMs?: number }
  | { kind: 'narrate'; narration: SceneNarration; atMs?: number }
  | { kind: 'wait'; ms: number }
  | { kind: 'custom'; type: string; payload?: Record<string, unknown>; atMs?: number }

/**
 * A scene is the atomic, reusable presentation unit. It only ever describes
 * what a real user could also do by hand — navigate, scroll, look at,
 * listen to. Scenes never call mutations or render anything a module
 * doesn't already render (see the engine's guiding principle in the TDD).
 */
export interface SceneDefinition {
  id: string // dot-namespaced, e.g. 'dashboard.welcome'
  module: string // grouping/analytics only — never branching logic
  title: string
  route: SceneRoute
  routeParams?: Record<string, string>
  searchParams?: Record<string, unknown>
  /** A data-presentation-target key the engine waits to appear post-navigation. */
  waitForSelector?: string
  /** Fallback scene duration (ms) when no narration audio is present. */
  duration?: number
  narration?: SceneNarration
  subtitles?: SubtitleCue[]
  camera?: SceneCamera
  highlight?: SceneHighlight
  /** Explicit multi-beat sequencing. Omit to let the engine synthesize a default sequence from the fields above. */
  timeline?: TimelineStep[]
  interactivePause?: SceneInteractivePause
  transition?: { type: 'fade' | 'none'; durationMs?: number }
  onComplete?: { event: string; payload?: Record<string, unknown> }
  /** Escape hatch for module-specific behavior outside the engine's fixed action vocabulary. */
  custom?: { type: string; payload?: Record<string, unknown> }
}
