# ADR-0015 — Presentation Engine Phase 2A: Homepage CTA Replacement, Least-Privilege Demo Role, and Tour Pack Curation

## Context

Phase 2A restores a normal public homepage flow and adds the Presentation Library UI plus the first deep, single-feature presentation (AI Content Studio), per an explicit instruction to freeze the Presentation Engine Core from Phase 1 (`docs/architecture/decisions/ADR-0014-presentation-engine-foundation.md`) and add only new scene data and library UI. Two decisions here are recorded because they touch shared/security-relevant state (the public demo account) or make a real product trade-off (replacing a working feature), not because they touch the engine itself — the engine was not modified.

## Decision 1: The homepage's public CTA now launches the Presentation Engine's Recruiter Tour instead of the old real-pipeline "Start Interactive Demo"

The previous homepage (`frontend/src/features/portfolio/PortfolioLanding.tsx`) auto-logged in as the demo account, created a real project, and drove the old `features/portfolio` tour system's live FFmpeg/Faster-Whisper execution end to end. The new "Watch Presentation" button instead logs in the same way but starts `recruiter-tour` — a curated Tour Pack over already-authored scenes (Dashboard → AI Content Studio → AI Chat) via the new engine. This is a genuine trade-off, not a like-for-like swap: the new presentation never triggers real generation/execution (the engine's guiding principle explicitly forbids calling mutations), where the old one did. This was accepted as intentional per the Phase 2A brief's exact homepage element list (Login, Watch Presentation, Case Study, GitHub — no mention of the old demo flow) and the instruction that the presentation must never auto-start, only launch from an explicit click. The `features/portfolio` tour system's files are untouched and still present, just no longer wired to the homepage.

**Consequence**: the Case Study copy on the homepage was rewritten to describe what actually happens now (a data-driven Presentation Engine narrating over the real app) rather than leave stale copy describing real FFmpeg execution that the button no longer performs — a "professional SaaS product" homepage cannot have a case study that misdescribes its own primary CTA.

## Decision 2: The shared public demo account (`demo@eyanstudio.dev`) gets a new, least-privilege `Viewer` role — not `Owner`, and not left at zero permissions

Routing the Recruiter Tour through Dashboard scenes surfaced a real 403 (`GET /models`) during live browser verification: the demo account had zero roles/permissions since its creation (it previously only ever visited Content Studio, which isn't permission-gated). Granting it `Owner` (as done for the Phase 1 verification account) was rejected outright — `demo@eyanstudio.dev` / its password are published in `backend/prisma/seed.ts`'s own comments and effectively public, so an admin-level credential would be a real security exposure, not just a demo inconvenience. Instead, the already-defined-but-previously-unused `Viewer` role (`backend/prisma/seed.ts`'s `roles` array, "Read-only user") is granted exactly the four permissions the Recruiter Tour's scenes touch — `dashboard`, `chat`, `models`, `conversations` — and assigned to the demo user. No other permission (`users`, `roles`, `finance`, `automation`, `presentation-engine`, etc.) is granted.

**Alternative considered and rejected**: narrow the Recruiter Tour to skip Dashboard scenes entirely, avoiding any backend/permission change. Rejected because it would have weakened the tour's "platform breadth before zooming into one feature" framing for the one tour a real recruiter is most likely to see, for a permission problem that has a small, correctly-scoped, least-privilege fix instead.

## Decision 3: Recruiter Tour and Customer Tour are pure data — no new scenes, no new engine logic

Per the Phase 2A scope ("only add new scene data and the Presentation Library UI"), `recruiter-tour.ts` and `customer-tour.ts` are `SceneRef[]` curations over scenes already authored in Phase 1 (`dashboard.scenes.ts`, `ai-chat.scenes.ts`) plus this phase's new `content-studio.scenes.ts` — exactly the Tour-Pack-as-playlist reuse the Phase 1 TDD anticipated. Two "Coming Soon" library entries (AI Chat, Finance) were added as static display data in `presentation-launcher.tsx` itself, not as empty/stub `TourPack` objects — an empty-scenes `TourPack` would silently no-op on click, which is a worse user experience than an explicitly disabled card.

## Consequences

- Any future Tour Pack aimed at an account with unknown/no permissions (another public entry point, an embed, etc.) should check what its scenes' routes actually require and grant the minimum `Viewer`-level permission needed — not assume zero-permission accounts work everywhere just because Content Studio happens to have no page-level gating.
- The `features/portfolio` tour system remains valid, unused-from-the-homepage code — a future decision to fully retire or formally migrate it (via the Phase 1 ADR's flagged `custom` action escape hatch) is still open, not decided here.
- Future "Coming Soon" library entries should follow the same static-data pattern, not a stub `TourPack`.
