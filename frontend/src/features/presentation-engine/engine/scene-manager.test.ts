import { afterEach, describe, expect, it } from 'vitest'
import { isSameRoute, resolveTargetElement, targetSelector, waitForElement } from './scene-manager'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('targetSelector / resolveTargetElement', () => {
  it('builds a data-presentation-target attribute selector', () => {
    expect(targetSelector('dashboard.quick-actions')).toBe(
      '[data-presentation-target="dashboard.quick-actions"]'
    )
  })

  it('resolves the element carrying the matching attribute', () => {
    const el = document.createElement('div')
    el.setAttribute('data-presentation-target', 'dashboard.quick-actions')
    document.body.appendChild(el)

    expect(resolveTargetElement('dashboard.quick-actions')).toBe(el)
    expect(resolveTargetElement('does-not-exist')).toBeNull()
  })
})

describe('isSameRoute', () => {
  it('matches on exact pathname equality', () => {
    expect(isSameRoute('/app/ai-chat', '/app/ai-chat')).toBe(true)
    expect(isSameRoute('/app', '/app/ai-chat')).toBe(false)
  })
})

describe('waitForElement', () => {
  it('resolves immediately if the element already exists', async () => {
    const el = document.createElement('div')
    el.setAttribute('data-presentation-target', 'already-there')
    document.body.appendChild(el)

    const found = await waitForElement(targetSelector('already-there'))
    expect(found).toBe(el)
  })

  it('resolves once a matching element is added to the DOM', async () => {
    const promise = waitForElement(targetSelector('added-later'), 2000)

    setTimeout(() => {
      const el = document.createElement('div')
      el.setAttribute('data-presentation-target', 'added-later')
      document.body.appendChild(el)
    }, 50)

    const found = await promise
    expect(found).not.toBeNull()
    expect(found?.getAttribute('data-presentation-target')).toBe('added-later')
  })

  it('resolves null on timeout rather than hanging the tour', async () => {
    const found = await waitForElement(targetSelector('never-appears'), 100)
    expect(found).toBeNull()
  })

  it('resolves null immediately if the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const found = await waitForElement(targetSelector('irrelevant'), 5000, controller.signal)
    expect(found).toBeNull()
  })
})
