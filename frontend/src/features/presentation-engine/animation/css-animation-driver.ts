import type { AnimationDriver } from './driver'

function findScrollableAncestor(el: Element): Element | null {
  let node: Element | null = el.parentElement
  while (node) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

function waitForScrollSettle(scrollContainer: Element | Window): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      scrollContainer.removeEventListener('scrollend', onScrollEnd as EventListener)
      clearTimeout(fallback)
      resolve()
    }
    const onScrollEnd = () => finish()
    // 'scrollend' isn't supported in every engine yet — a bounded fallback
    // timeout keeps camera moves from ever hanging a scene.
    scrollContainer.addEventListener('scrollend', onScrollEnd as EventListener, { once: true })
    const fallback = setTimeout(finish, 700)
  })
}

export function createCssAnimationDriver(reducedMotion: boolean): AnimationDriver {
  return {
    reducedMotion,

    crossfadeClassNames: reducedMotion
      ? { enter: '', exit: '' }
      : {
          enter: 'animate-in fade-in-0 slide-in-from-bottom-4',
          exit: 'animate-out fade-out-0 slide-out-to-bottom-4',
        },

    async panViewport(el, opts) {
      const behavior = reducedMotion ? 'instant' : opts.behavior
      el.scrollIntoView({ behavior, block: 'center', inline: 'nearest' })

      if (behavior === 'instant') return

      const scrollContainer = findScrollableAncestor(el) ?? window
      await waitForScrollSettle(scrollContainer)
    },

    pulse(el, opts) {
      if (reducedMotion) {
        el.classList.add('presentation-focus-static')
        return () => el.classList.remove('presentation-focus-static')
      }

      const className =
        opts.style === 'glow'
          ? 'presentation-pulse-glow'
          : opts.style === 'focus-ring'
            ? 'presentation-pulse-focus-ring'
            : 'presentation-pulse-spotlight'

      el.classList.add(className)
      return () => el.classList.remove(className)
    },
  }
}
