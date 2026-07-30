import type { SceneRoute } from '../types/scene'

const DEFAULT_WAIT_FOR_SELECTOR_TIMEOUT_MS = 5000

/**
 * The attribute-based selector strategy — see the TDD's Component
 * Discovery decision. Not run through CSS.escape: that's for unquoted
 * identifiers, and this key always sits inside a quoted attribute value
 * where dots and hyphens need no escaping.
 */
export function targetSelector(key: string): string {
  return `[data-presentation-target="${key}"]`
}

export function resolveTargetElement(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(targetSelector(key))
}

export function isSameRoute(currentPathname: string, sceneRoute: SceneRoute): boolean {
  return currentPathname === sceneRoute
}

/**
 * Polls for an element to appear (route code-splitting means the target
 * may still be lazily mounting even after navigation resolves). Bounded
 * and non-fatal: callers should treat a null result as "skip highlight/
 * camera for this scene," never as a reason to hang the tour.
 */
export function waitForElement(
  selector: string,
  timeoutMs = DEFAULT_WAIT_FOR_SELECTOR_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLElement>(selector)
    if (existing) {
      resolve(existing)
      return
    }

    if (signal?.aborted) {
      resolve(null)
      return
    }

    let settled = false
    const finish = (el: HTMLElement | null) => {
      if (settled) return
      settled = true
      observer.disconnect()
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(el)
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) finish(el)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const timer = setTimeout(() => finish(null), timeoutMs)

    const onAbort = () => finish(null)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
