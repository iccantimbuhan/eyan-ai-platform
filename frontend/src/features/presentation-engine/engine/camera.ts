import type { AnimationDriver } from '../animation/driver'
import { resolveTargetElement } from './scene-manager'

export function resolveTargets(keys: string | string[]): HTMLElement[] {
  const list = Array.isArray(keys) ? keys : [keys]
  return list.map(resolveTargetElement).filter((el): el is HTMLElement => el !== null)
}

export function computeFrame(el: Element): DOMRect {
  return el.getBoundingClientRect()
}

export async function panTo(
  driver: AnimationDriver,
  targets: HTMLElement[],
  opts: { behavior?: 'smooth' | 'instant' } = {}
): Promise<void> {
  const [primary] = targets
  if (!primary) return
  await driver.panViewport(primary, { behavior: opts.behavior ?? 'smooth' })
}
