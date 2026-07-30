import type { SceneRoute } from '../types/scene'

/**
 * Single indirection point between a scene's authored route and the route
 * actually navigated to. Phase 1-4 scope routing to the primary
 * `app/_authenticated` tree (identity passthrough); if the `clerk/_authenticated`
 * tree ever needs parity, it gains a prefix-swap branch here — a contained,
 * mechanical change rather than touching every scene definition.
 */
export function resolveRoute(sceneRoute: SceneRoute): SceneRoute {
  return sceneRoute
}
