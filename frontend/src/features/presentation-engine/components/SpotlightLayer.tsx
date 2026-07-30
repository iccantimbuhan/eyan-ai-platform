import * as React from 'react'
import { usePresentationStore } from '@/stores/presentation-store'
import { resolveTargetElement } from '../engine/scene-manager'

interface TargetRect {
  key: string
  rect: DOMRect
}

const CALLOUT_ID = 'presentation-engine-callout'

/**
 * Computes and holds target rects itself (never in the global store) so
 * scroll/resize churn doesn't force every store subscriber to re-render —
 * only this component re-renders on scroll.
 */
function useTargetRects(targets: string[]): TargetRect[] {
  const [rects, setRects] = React.useState<TargetRect[]>([])
  const targetsKey = targets.join('|')

  React.useEffect(() => {
    if (targets.length === 0) return

    const recompute = () => {
      const next: TargetRect[] = []
      for (const key of targets) {
        const el = resolveTargetElement(key)
        if (el) next.push({ key, rect: el.getBoundingClientRect() })
      }
      setRects(next)
    }

    recompute()

    const elements = targets
      .map(resolveTargetElement)
      .filter((el): el is HTMLElement => el !== null)
    const resizeObserver = new ResizeObserver(recompute)
    elements.forEach((el) => resizeObserver.observe(el))

    window.addEventListener('scroll', recompute, true)
    window.addEventListener('resize', recompute)

    // A target may still be mounting right after navigation — a brief
    // poll covers that without a persistent interval for the whole scene.
    const pollId = window.setInterval(recompute, 200)
    const stopPollId = window.setTimeout(() => window.clearInterval(pollId), 3000)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', recompute, true)
      window.removeEventListener('resize', recompute)
      window.clearInterval(pollId)
      window.clearTimeout(stopPollId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey])

  return targets.length === 0 ? [] : rects
}

export function SpotlightLayer() {
  const activeTargets = usePresentationStore((s) => s.activeTargets)
  const activeCalloutText = usePresentationStore((s) => s.activeCalloutText)
  const rects = useTargetRects(activeTargets)

  // Screen readers get the callout via aria-describedby on the real
  // highlighted element, not by stealing focus — see the TDD's
  // Accessibility section.
  React.useEffect(() => {
    const el = rects[0] ? resolveTargetElement(rects[0].key) : null
    if (!el || !activeCalloutText) return

    const previous = el.getAttribute('aria-describedby')
    el.setAttribute('aria-describedby', CALLOUT_ID)
    return () => {
      if (previous) el.setAttribute('aria-describedby', previous)
      else el.removeAttribute('aria-describedby')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rects[0]?.key, activeCalloutText])

  if (rects.length === 0) return null

  return (
    <div aria-hidden='true' className='pointer-events-none fixed inset-0' style={{ zIndex: 'var(--z-presentation)' }}>
      {rects.map(({ key, rect }) => (
        <div
          key={key}
          className='presentation-pulse-spotlight absolute transition-all duration-300 ease-out'
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      ))}

      {activeCalloutText && rects[0] && (
        <div
          id={CALLOUT_ID}
          role='status'
          aria-live='polite'
          className='absolute max-w-xs rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md transition-all duration-300 ease-out'
          style={{
            top: Math.min(rects[0].rect.bottom + 12, window.innerHeight - 96),
            left: Math.max(12, Math.min(rects[0].rect.left, window.innerWidth - 296)),
          }}
        >
          {activeCalloutText}
        </div>
      )}
    </div>
  )
}
