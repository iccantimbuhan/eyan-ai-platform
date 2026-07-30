# ADR-0014 — Presentation Engine Foundation: CSS-Only Motion, Attribute-Based Targeting, and Data-Driven Pacing

## Context

Phase 1 introduces the Presentation Engine — a reusable platform capability that automatically presents the real EYAN Studio application (narration, highlights, guided navigation) rather than a set of new pages or mockups, per an approved Technical Design Document. Three decisions made during this phase are recorded here because each is either genuinely new to this codebase or non-obvious enough that Phase 2+ (AI Content Studio and beyond) should follow the same pattern rather than reinvent it.

## Decision 1: Motion stays CSS-only, behind a small `AnimationDriver` seam — no Framer Motion or other JS animation library added

This codebase had zero JS animation libraries before this phase (all existing motion is `tw-animate-css` utility classes driven by Radix `data-state` attributes, plus one hand-written `@keyframes` pair for Collapsible). The Presentation Engine's camera pans, spotlight movement, and pulse/glow effects are implemented entirely with native `scrollIntoView`/`scroll-behavior: smooth` and new hand-written `@keyframes` (`presentation-spotlight-pulse`, `presentation-glow-pulse` in `frontend/src/styles/index.css`), following the exact convention already established by the Collapsible `slideDown`/`slideUp` keyframes. All of it sits behind a small `AnimationDriver` interface (`frontend/src/features/presentation-engine/animation/driver.ts`) with one implementation, `css-animation-driver.ts` — Camera/Highlight/Timeline code calls the interface, never CSS classes directly, so a future `framer-motion-driver.ts` (for interruptible/gesture-driven motion, if a real requirement emerges) is a new file plus one wiring change, not a rewrite.

**Alternative considered and rejected**: add Framer Motion now for richer orchestration ergonomics. Rejected — confirmed with the user before implementation — because every concrete motion need (camera pan easing, spotlight interpolation, multi-step sequencing) is already satisfiable natively, and this codebase's own engineering standards explicitly weigh against introducing a dependency a demonstrably-sufficient native approach already covers.

## Decision 2: A new, opt-in `data-presentation-target` attribute — not an overload of `data-slot` or `data-testid`

Scenes need to target one specific instance of a component on a specific page (e.g. "the Brand Kit card," not "any Card"). The existing `data-slot` convention (160+ occurrences) identifies component *anatomy* ("this is a Card root"), not a specific instance — reusing it would require making shadcn's structural values instance-unique, breaking every existing consumer. `data-testid` is documented as test-file-only. Instead, feature owners add `data-presentation-target="<module>.<key>"` directly to a real component's root JSX, once per targeted element (two pilot instrumentations landed this phase: `frontend/src/features/dashboard/index.tsx`, `frontend/src/features/ai-chat/index.tsx`). Scenes reference the key, never a raw CSS selector, so internal DOM refactors don't break a scene as long as the attribute travels with the element.

## Decision 3: Scene pacing must be computed independent of whether narration actually contributed real playback time

The Scene Manager originally paced a scene by running its timeline steps (camera → highlight → narrate) and only applying the scene's authored `duration` as a floor when *no* narrate/wait step had run at all. This was wrong: a scene with narration *text* but no `narration.audioAsset` (Phase 1's only shipped case, since TTS providers are Phase 5) resolves `narrate` near-instantly — the pre-recorded provider's `play()` has nothing to await — so the tour raced through all five Phase 1 scenes in under two seconds during first browser verification. Fixed by always computing `remainingMs = computeSceneDurationMs(scene, narrationDurationMs) - elapsedMsInScene` after the timeline loop and topping up whatever's left, using `elapsedMsInScene` (tracked via `narrate`'s `timeupdate`/no-op path and `wait`'s tick callback) as the single source of truth rather than a "did anything time-consuming run" boolean. See `frontend/src/features/presentation-engine/hooks/use-presentation-runner.ts`.

**Consequence for Phase 5**: once a TTS/pre-recorded audio provider actually returns a non-zero `durationMs`, this same top-up logic makes narration length the de facto pacing (since `computeSceneDurationMs` takes the max of authored duration and narration length) with no further change needed.

## Decision 4: The RBAC permission key must be seeded on both the frontend registry and the backend `Permission` table

`frontend/src/features/roles/config/permissions.ts` only feeds the Roles admin UI's display categories — it does not grant anything. The actual `'presentation-engine'` permission had to also be added to `backend/prisma/seed.ts`'s `permissions` array (auto-granted to the `Owner` role, matching every other permission there) and the seed re-run, or `useCan('presentation-engine')` returns `false` for every user regardless of role. Confirmed the hard way during browser verification: the newly-added frontend registry entry alone was not sufficient to grant access even to an Owner-role account.

## Consequences

- Any future module's scenes (Phase 2+) should use `data-presentation-target` the same way, and should not assume narration duration alone paces a scene — always rely on `computeSceneDurationMs`'s max-of-authored-and-narration-length, applied via the remaining-time top-up, not a step-presence boolean.
- Any future new permission key gated by `useCan()` must be added to **both** `frontend/src/features/roles/config/permissions.ts` (for the Roles UI) and `backend/prisma/seed.ts`'s `permissions` array (for it to actually exist and be grantable) — this dual-registration requirement is easy to miss and worth flagging explicitly for the next engineer who adds a permission-gated feature.
- The animation-driver seam should be reused, not bypassed, by any future Presentation Engine subsystem that needs visual motion.
