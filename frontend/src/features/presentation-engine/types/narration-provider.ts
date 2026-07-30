import type { NarrationProviderId, SceneNarration } from './scene'

export interface NarrationHandle {
  audio?: HTMLAudioElement
  durationMs: number
}

/**
 * Provider-agnostic narration seam. Phase 1 ships only the pre-recorded
 * provider (see narration/providers/pre-recorded-provider.ts); TTS
 * providers (OpenAI/ElevenLabs/Google/Azure) register into the same
 * NarrationProviderRegistry in a later phase without touching playback
 * or sync code.
 */
export interface NarrationProvider {
  id: NarrationProviderId
  supportsRateControl: boolean
  prepare(narration: SceneNarration): Promise<NarrationHandle>
  play(handle: NarrationHandle, opts: { rate: number }): Promise<void>
  pause(handle: NarrationHandle): void
  resume(handle: NarrationHandle): void
  stop(handle: NarrationHandle): void
}
