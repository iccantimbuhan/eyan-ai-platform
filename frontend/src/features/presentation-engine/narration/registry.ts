import type { NarrationProvider } from '../types/narration-provider'
import type { NarrationProviderId } from '../types/scene'
import { preRecordedProvider } from './providers/pre-recorded-provider'

/**
 * Phase 5 adds openai/elevenlabs/google/azure providers here, each
 * calling a new backend TTS route — zero changes to playback/sync code.
 */
const providers: Partial<Record<NarrationProviderId, NarrationProvider>> = {
  'pre-recorded': preRecordedProvider,
}

export function getNarrationProvider(id: NarrationProviderId = 'pre-recorded'): NarrationProvider {
  return providers[id] ?? preRecordedProvider
}
