import type { AnyRouter } from '@tanstack/react-router'

// A tiny escape hatch so modules outside the React tree (the axios response
// interceptor in services/api.ts) can perform an SPA navigation instead of a
// hard `window.location` reload — without importing the router from main.tsx,
// which would create a circular import (api.ts is imported by ~20 modules
// that main.tsx's own dependency graph eventually pulls in). Set once, right
// after the router is created in main.tsx.
let routerInstance: AnyRouter | null = null

export function setRouterInstance(router: AnyRouter): void {
  routerInstance = router
}

export function getRouterInstance(): AnyRouter | null {
  return routerInstance
}
