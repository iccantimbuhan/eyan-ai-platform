import type { useNavigate } from '@tanstack/react-router'
import { usePresentationStore } from '@/stores/presentation-store'
import { resolveRoute } from '../engine/resolve-route'
import { resolveTourPackScenes, TOUR_PACKS } from '../tour-packs/registry'

/**
 * Shared by the Presentation Library and the public homepage's "Watch
 * Presentation" CTA — both do the exact same thing (load a Tour Pack's
 * scenes into the store, then navigate to the first scene's real route)
 * and this is the one place that logic lives, not a Presentation Engine
 * Core module: it's page-level wiring around the frozen engine's public
 * `start()`/`navigate` surface, not a change to the engine itself.
 */
export function startTourPack(tourPackId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const pack = TOUR_PACKS[tourPackId]
  if (!pack) return false

  const scenes = resolveTourPackScenes(pack)
  if (scenes.length === 0) return false

  usePresentationStore.getState().start(pack.id, scenes)

  const firstScene = scenes[0]
  navigate({
    to: resolveRoute(firstScene.route),
    params: firstScene.routeParams,
  } as Parameters<typeof navigate>[0])

  return true
}
