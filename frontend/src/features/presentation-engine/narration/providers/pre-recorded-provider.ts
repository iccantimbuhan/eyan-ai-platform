import type { NarrationProvider } from '../../types/narration-provider'

const AUDIO_LOAD_TIMEOUT_MS = 5000

/**
 * Phase 1's only narration provider: plays a static, pre-recorded audio
 * asset. Zero backend work. Scenes with no `narration.audioAsset` still
 * work — `prepare()` resolves an empty handle and `play()` is a no-op,
 * so the scene's authored `duration` becomes the pacing fallback.
 */
export const preRecordedProvider: NarrationProvider = {
  id: 'pre-recorded',
  supportsRateControl: true,

  async prepare(narration) {
    if (!narration.audioAsset) return { durationMs: 0 }

    const audio = new Audio(narration.audioAsset)
    audio.preload = 'auto'

    const durationMs = await new Promise<number>((resolve) => {
      const timer = setTimeout(() => resolve(0), AUDIO_LOAD_TIMEOUT_MS)
      audio.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(timer)
          resolve(Number.isFinite(audio.duration) ? audio.duration * 1000 : 0)
        },
        { once: true }
      )
      audio.addEventListener(
        'error',
        () => {
          clearTimeout(timer)
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[presentation-engine] Failed to load narration audio: ${narration.audioAsset}`)
          }
          resolve(0)
        },
        { once: true }
      )
    })

    return { audio, durationMs }
  },

  play(handle, opts) {
    if (!handle.audio) return Promise.resolve()

    handle.audio.playbackRate = opts.rate
    return new Promise((resolve) => {
      handle.audio!.addEventListener('ended', () => resolve(), { once: true })
      handle.audio!.play().catch(() => resolve())
    })
  },

  pause(handle) {
    handle.audio?.pause()
  },

  resume(handle) {
    handle.audio?.play().catch(() => {})
  },

  stop(handle) {
    if (!handle.audio) return
    handle.audio.pause()
    handle.audio.currentTime = 0
  },
}
