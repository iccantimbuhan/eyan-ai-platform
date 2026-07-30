import { describe, expect, it, vi } from 'vitest'
import { registerCustomAction, runCustomAction } from './custom-action-registry'

describe('custom action registry', () => {
  it('invokes the handler registered for a type, with payload and context', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    registerCustomAction('test.echo', handler)

    const controller = new AbortController()
    await runCustomAction('test.echo', { foo: 'bar' }, { sceneId: 'scene-1', signal: controller.signal })

    expect(handler).toHaveBeenCalledWith({ foo: 'bar' }, { sceneId: 'scene-1', signal: controller.signal })
  })

  it('is a safe no-op when no handler is registered for the type', async () => {
    const controller = new AbortController()
    await expect(
      runCustomAction('test.unregistered-type', undefined, { sceneId: 'scene-1', signal: controller.signal })
    ).resolves.toBeUndefined()
  })
})
