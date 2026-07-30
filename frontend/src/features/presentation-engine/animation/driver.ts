/**
 * The seam between the engine's Camera/Highlight/Timeline code and how
 * motion is actually implemented. Phase 1-4 use `cssAnimationDriver`
 * (native scroll + CSS transitions/keyframes, zero new dependencies —
 * see the TDD's Animation Strategy decision). A future `framer-motion-
 * driver.ts` for interruptible/gesture-driven motion would implement the
 * same interface; call sites never change.
 */
export interface AnimationDriver {
  /** Smoothly (or instantly) brings an element into view. Resolves once the pan has settled. */
  panViewport(el: Element, opts: { behavior: 'smooth' | 'instant'; padding?: number }): Promise<void>
  /** Starts a looping pulse/glow effect on an element; returns a function that stops it. */
  pulse(el: HTMLElement, opts: { style: 'spotlight' | 'glow' | 'focus-ring' }): () => void
  /** Class names toggled on the overlay root for its mount/unmount transition. */
  crossfadeClassNames: { enter: string; exit: string }
  /** Whether the driver should skip motion entirely (prefers-reduced-motion). */
  reducedMotion: boolean
}
