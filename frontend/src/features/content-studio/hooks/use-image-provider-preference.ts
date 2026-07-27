import { useCallback, useState } from 'react'
import type { ImageProviderOption } from '../types/image'

const STORAGE_KEY = 'content-studio:image-provider'
const VALID_VALUES: ImageProviderOption[] = [
  'auto',
  'gemini',
  'comfyui',
  'huggingface',
  'fake',
]

function isImageProviderOption(
  value: string | null
): value is ImageProviderOption {
  return value !== null && (VALID_VALUES as string[]).includes(value)
}

function readStoredProvider(): ImageProviderOption {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isImageProviderOption(raw) ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

/**
 * Remembers the last-selected image provider across visits, persisted to
 * localStorage only (no backend) — same pattern as
 * useRecentTemplates()'s last-template tracking.
 */
export function useImageProviderPreference() {
  const [provider, setProviderState] =
    useState<ImageProviderOption>(readStoredProvider)

  const setProvider = useCallback((next: ImageProviderOption) => {
    setProviderState(next)

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded) —
      // remembering the preference is a convenience, not required.
    }
  }, [])

  return { provider, setProvider }
}
