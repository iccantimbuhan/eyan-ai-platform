import * as React from 'react'

/**
 * Subscribes to whether a DOM element is currently within the viewport.
 * Used by the Highlight System to avoid rendering a spotlight box around
 * a target that's been scrolled out of view.
 */
export function useInViewport(el: Element | null): boolean {
  const [inViewport, setInViewport] = React.useState(false)

  React.useEffect(() => {
    if (!el) return

    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])

  return el ? inViewport : false
}
