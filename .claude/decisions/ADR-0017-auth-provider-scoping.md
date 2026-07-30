# ADR-0017 — Scope Session Restoration to `/app/_authenticated`, Not the Whole App

## Context

Phase 2C's investigation (documented in the prior conversation turn, not a separate file) found that `AuthProvider` wrapped `<RouterProvider>` at the top of `main.tsx` — meaning every route, public and protected, waited behind a global "Restoring session..." gate and a possible hard `window.location.href = '/sign-in'` redirect, triggered purely by a stale 7-day token cookie regardless of which route was requested. The routing structure itself (`/` outside `_authenticated`, `/app/_authenticated`'s `beforeLoad` guard) was already correct and is untouched by this change.

## Decision 1: Relocate `AuthProvider` into `AuthenticatedLayout`, not a rewrite

`AuthProvider` is used in exactly one place (`main.tsx`) and establishes no React context — it is a pure side-effecting gate (call `/auth/me`, hold `children` behind a loading screen until it settles). Moving it required no changes to its consumers because it has none beyond its own render output. It is now mounted inside `components/layout/authenticated-layout.tsx`, wrapping that component's own JSX — not inside the `/app/_authenticated` route file itself, because defining a component inline there triggers `react-refresh/only-export-components` (route files are expected to export only `Route`). `AuthenticatedLayout` already exports exactly one component, so this is a zero-new-lint-issue location. `_authenticated/route.tsx`'s `beforeLoad` (the "no token at all → redirect to /sign-in" check) is unchanged and still runs first, before `AuthenticatedLayout`/`AuthProvider` ever mounts — so by the time `AuthProvider` runs, a token is always present; its job is only to validate it and load the user/permissions.

**Consequence**: `main.tsx` no longer imports `AuthProvider` at all. Every route outside `/app/_authenticated` renders immediately with zero network dependency.

## Decision 2: Skip redundant restoration when `auth.user` is already set

Relocating `AuthProvider` inside `_authenticated` means it now mounts fresh every time a session enters that subtree — including immediately after `useLogin()` (used by both the normal sign-in form and the Presentation Engine's "Watch Presentation" demo-login flow), which already calls `auth.setUser()` synchronously before navigating. Without a guard, `AuthProvider` would still unconditionally re-fetch `/auth/me` right as the first protected page/scene appears — a redundant round-trip and a brief "Restoring session..." flash injected into the demo flow, which the brief explicitly required to remain untouched. The fix is a one-line guard: skip the fetch (and the loading screen) when `auth.user` is already non-null, restoring it only when `auth.user` is `null` in fresh JS memory (a real page reload) even though the token cookie survived.

## Decision 3: Two real bugs found in `services/api.ts` during Scenario 5 verification (expired session on `/app`) — fixed, not worked around

**Bug A — circular deadlock, not a redirect.** `refreshAccessToken()` posts to `/auth/refresh` through the same `api` axios instance whose response interceptor retries a 401 by calling `refreshAccessToken()` again. When the refresh token itself is invalid, `/auth/refresh`'s own 401 re-enters that same interceptor path, which awaits the *same* `refreshPromise` that is at that moment in the process of rejecting from underneath it — a promise that can never settle. The visible symptom was not a redirect loop but a permanent hang on "Restoring session..." — the redirect line was never reached at all. Fixed by excluding requests to `/auth/refresh` from the retry-via-refresh branch (`originalRequest.url.includes('/auth/refresh')`) so a failing refresh call fails plainly instead of recursing.

**Bug B — nested redirect params.** With Bug A fixed, more than one in-flight request 401ing around the same time (amplified by React StrictMode's double-effect-invocation in dev, but possible in production too) each independently navigated to `/sign-in`, capturing `window.location.href` *after* a prior navigation had already appended a `redirect` param — nesting it inside itself on each repeat. Fixed with a one-line guard: skip navigating if already on `/sign-in`.

Both fixes are scoped to the interceptor's failure path only; the retry-on-401 happy path (valid refresh token) is unchanged.

## Decision 4: Hard `window.location.href` replaced with SPA `router.navigate()`, via a tiny router-instance holder

`services/api.ts` is a plain module with ~20 importers; it cannot import the router from `main.tsx` without a circular import. `frontend/src/lib/router-instance.ts` is a minimal `set`/`get` holder for the router instance, populated once by `main.tsx` right after `createRouter()`. The `window.location.href` fallback is kept only for the (should-never-happen) case where the router hasn't been set yet.

## Consequences

- No changes to routing structure, RBAC/`useCan()`, the auth store, cookie handling, the Presentation Engine, or the demo-account login flow.
- A future 401 scenario should never need another interceptor-level fix of this shape — the refresh-call exclusion and the already-on-sign-in guard are both general, not scenario-specific.
- Verified via 6 real browser scenarios (fresh browser, valid session, expired session — landing and `/app`, `/app` with valid session, full Watch Presentation flow) — see conversation record for scripts/screenshots.
