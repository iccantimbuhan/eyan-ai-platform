import * as React from 'react'
import { usePresentationStore } from '@/stores/presentation-store'

/**
 * Space/←/→/Escape, active only while a tour is running and disabled
 * whenever focus is inside a real form field the tour might be
 * highlighting — a presentation must never fight normal typing.
 */
export function usePresentationKeyboardShortcuts(active: boolean, onExit: () => void) {
  React.useEffect(() => {
    if (!active) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (isTyping) return

      const store = usePresentationStore.getState()

      if (event.code === 'Space') {
        event.preventDefault()
        if (store.playbackStatus === 'playing') store.pause()
        else store.play()
      } else if (event.key === 'ArrowRight') {
        store.next()
      } else if (event.key === 'ArrowLeft') {
        store.prev()
      } else if (event.key === 'Escape') {
        onExit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, onExit])
}
