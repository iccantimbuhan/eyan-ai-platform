# Sprint 6.5 — Analytics Foundation

Status: Completed

## Goal

Fifth phase of Sprint 6 ("Enterprise Creative Production Suite"): add the data and query layer Sprint 6.6's Production Dashboard will visualize, tracking Content/Image/Video Generation, Brand Kit usage, Review workflow, Publishing, Provider usage, Generation duration, Review duration, Approval metrics, and Project activity — reusing existing events wherever possible, avoiding duplicate logging, and never letting an analytics failure interrupt a normal application workflow.

## Scope

### In Scope

- Research confirming exactly what's already answerable from existing tables versus what's genuinely missing.
- One new, purely additive `AnalyticsEvent` table covering the one genuine gap: first-time generation writes no event/log row anywhere today.
- A fire-and-forget (genuinely unawaited) analytics write from `ContentService`/`ImageService`/`VideoAssetService.generate()`.
- A new read-only `AnalyticsService` aggregating existing tables (`AssetReview`, `AssetReviewEvent`, `PublishingRecord`, `GeneratedContent`/`GeneratedImage`/`VideoAsset`/`BrandKit`) for project and platform-wide summaries.
- A unified, paginated project activity feed merging `AnalyticsEvent` and `AssetReviewEvent`.
- New `authenticate`-only endpoints under `/api/v1/analytics/...`.

### Out of Scope (explicit, deferred)

- Any frontend — Sprint 6.5 is backend-only, matching the precedent Sprint 4.1 already set (a complete backend pipeline shipped before any frontend existed for it). Sprint 6.6 builds the dashboard UI.
- Writing generation events into the existing `AssetReviewEvent` table — kept as a separate `AnalyticsEvent` table instead, to preserve `AssetReviewEvent`'s review-scoped purpose (ADR-0009). See Decisions Made.
- A new RBAC gate on the analytics endpoints — stay `authenticate`-only, consistent with every existing Content Studio route.
- Per-platform publishing-performance accuracy (an asset published to two platforms in overlapping windows could have its timing pairs computed across both indiscriminately) — accepted as a "Foundation"-level approximation.

## What Shipped

**Research first** — confirmed via two parallel research passes that almost every tracked metric is already queryable from existing tables (see the table in ADR-0011/the approved plan) with exactly one gap: `ContentService`/`ImageService`/`VideoAssetService.generate()` never write to `AssetReviewEvent` (only entered later, once the QA workflow touches an asset), so there was no unified log of "this asset was generated" anywhere. Also confirmed there is no existing "fire-and-forget inside a request" precedent — only an unawaited pattern at server boot (health checks) and an awaited-but-swallowed "best-effort" pattern for secondary writes that protect a real invariant (`ImageService.delete()`/`markFailed()`).

**Data model** — one new, purely additive table, `AnalyticsEvent`, same append-only polymorphic `(assetType, sourceId)` shape as `AssetReviewEvent`, with real `provider`/`model`/`generationTimeMs`/`brandKitId` columns (not JSON) so aggregation can group/average on them directly. New minimal `AnalyticsEventType` enum (`GENERATED` only, room to grow additively). Deliberately a separate table from `AssetReviewEvent` rather than a new `ReviewEventType` value — see Decisions Made.

**Backend — write path** — `ContentService`, `ImageService`, and `VideoAssetService` each gained one new constructor parameter (`analyticsEventRepository`, default-instantiated) and one new call at the end of a successful generation: `void this.analyticsEventRepository.create(...).catch((error) => logger.error(...))` — genuinely unawaited, not just awaited-and-swallowed. `VideoAssetService` factors this into a shared private `recordAnalytics()` helper reused by both its text and image generation paths.

**Backend — repositories** — new `AnalyticsEventRepository` (`create`, `findManyByProject`, `groupByAssetType`, `groupByProvider`, `groupByBrandKit`). Three existing repositories each gained one new, additive method: `AssetReviewEventRepository.findManyByProject`, `AssetReviewRepository.findManyByProject`, `PublishingRecordRepository.findManyByProject` — none previously supported a project-wide query, only per-asset or per-source-id-pairs lookups.

**Backend — read side** — new `AnalyticsService`, composing the above plus every existing generation/brand-kit/saved-prompt repository, aggregating in the service layer (matching `AssetService.list()`'s established ADR-0008 posture, not raw SQL rollups): `getProjectSummary()` (asset counts by type; review/publishing status counts, with an implicit `DRAFT` count folded in for assets with no `AssetReview` row; provider usage with average generation duration; brand kit usage; review/publishing performance computed by pairing the first `NEEDS_REVIEW`→`APPROVED` and `PUBLISH_STARTED`→`PUBLISHED` transitions per asset), `getPlatformSummary()` (the same rollup merged, weighted by sample size, across every project the requesting user owns), and `getProjectActivity()` (merges `AnalyticsEvent` and `AssetReviewEvent` rows into one normalized, paginated, newest-first feed).

**Backend — endpoints** — `GET /api/v1/analytics/summary`, `GET /api/v1/analytics/projects/:projectId/summary`, `GET /api/v1/analytics/projects/:projectId/activity`, all `authenticate`-gated only.

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260727142118_add_analytics_foundation/`, `repositories/analytics-event.repository.ts` (+test), `dto/analytics.dto.ts`, `services/analytics.service.ts` (+test), `controllers/analytics.controller.ts`, `routes/v1/analytics.routes.ts`, `validators/analytics.validator.ts`.

**Backend — modified:** `prisma/schema.prisma` (+`AnalyticsEventType` enum, +`AnalyticsEvent` model, +relation fields on `User`/`ContentProject`), `app.ts` (+route registration), `services/content.service.ts`/`image.service.ts`/`video-asset.service.ts` (+`analyticsEventRepository` dependency, +fire-and-forget write, +tests proving generation still succeeds when the write rejects), `repositories/asset-review-event.repository.ts`/`asset-review.repository.ts`/`publishing-record.repository.ts` (+`findManyByProject`, +tests).

**Docs:** `.claude/decisions/ADR-0011-analytics-foundation.md` (new), `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added.

## Database Changes

Migration `20260727142118_add_analytics_foundation` (Prisma-generated via `prisma migrate dev` against the real development database, not hand-authored): new `AnalyticsEventType` enum; new `AnalyticsEvent` table (owned by `ContentProject` via `projectId`, cascade delete; `actorId` references `User`, cascade delete). Fully additive — no existing column altered or dropped, no backfill needed. `prisma migrate status` confirmed clean after applying.

## API Changes

New, all `authenticate`-gated, ownership-checked the same way every other project-scoped endpoint already is:
- `GET /api/v1/analytics/summary` — platform-wide rollup across every project the requesting user owns.
- `GET /api/v1/analytics/projects/:projectId/summary` — per-project rollup.
- `GET /api/v1/analytics/projects/:projectId/activity` — paginated, merged activity feed.

No existing endpoint's shape changed.

## Validation

- Build: clean (backend `tsc`). No frontend changes this sprint.
- Typecheck: clean.
- Lint: backend has no lint step (matches existing convention).
- Tests: 442/442 passing (up from 384 pre-sprint baseline — new: `analytics-event.repository.test.ts`, `analytics.service.test.ts`, plus new cases in `content.service.test.ts`/`image.service.test.ts`/`video-asset.service.test.ts` proving generation succeeds even when the analytics write rejects, and new cases in `asset-review-event.repository.test.ts`/`asset-review.repository.test.ts`/`publishing-record.repository.test.ts` for the new `findManyByProject` methods).
- Live validation (2026-07-27, against the real EYAN Studio development database and backend, on a throwaway project + user, cascade-deleted afterward): confirmed an empty summary before any generation; generated one content (via real Ollama), one image (fake provider), and one video-script asset (via real Ollama) and confirmed the summary's asset counts, provider usage (`ollama` used twice, `fake` once, both with non-negative average generation durations — the real Ollama call averaged ~152s, consistent with this hardware's documented slow-generation profile), and the activity feed (3 generation events, correctly sorted newest-first) all reflected them; ran the image through `NEEDS_REVIEW → APPROVED` and a full schedule→publish cycle, confirming `reviewStatusCounts` (1 `APPROVED`, the other 2 assets correctly folded into an implicit `DRAFT` count), `publishingStatusCounts`, `reviewPerformance`, and `publishingPerformance` all updated correctly, and that the activity feed grew to include both review- and generation-sourced events; confirmed the platform-wide summary correctly matched the one project's totals; confirmed all three generation calls returned `201` throughout — analytics never surfaced as a blocking error, directly demonstrating the fire-and-forget requirement end-to-end, not just in unit tests. Regression: Asset Library listing and content detail retrieval both confirmed still working unchanged. All test data cleaned up afterward — verified zero leftover rows (one leftover `User` row from registration, not cascaded by the project delete, was found and removed directly).

## Decisions Made

- **A new, separate `AnalyticsEvent` table**, not a write into `AssetReviewEvent` for generation events — keeps `AssetReviewEvent`'s review-scoped purpose (ADR-0009) intact and avoids coupling the plain generation services (which have never depended on the review/versioning layer) to it. See ADR-0011, Decision 1.
- **The analytics write is genuinely unawaited (fire-and-forget)**, not just awaited-and-swallowed like `ImageService.delete()`/`markFailed()` — a deliberate, reasoned first inside a request path in this codebase, since (unlike a file delete) no invariant requires the analytics row to exist before the response returns. See ADR-0011, Decision 2.
- **No new RBAC gate on the new endpoints.** They stay `authenticate`-only, consistent with every existing Content Studio route, even though unused `"analytics"`/`"dashboard"` permissions already exist in the seed data. See ADR-0011, Decision 3.
- **Sprint 6.5 ships backend-only.** Matches the precedent Sprint 4.1 already set; Sprint 6.6 builds the dashboard UI (via the already-installed, previously-unused `recharts` dependency) on top of these endpoints.
- **Publishing performance is computed per `(assetType, sourceId)`, not per platform** — `AssetReviewEvent` doesn't carry `platform` as a first-class column, only inside `metadata`. Accepted as a "Foundation"-level approximation, flagged explicitly rather than silently accepted.

## Follow-ups for Future Sprints

- Sprint 6.6 (Production Dashboard) — per the approved Sprint 6 plan, builds the dashboard UI on top of these endpoints using `recharts`.
- Per-platform publishing performance, if the current per-asset approximation proves insufficient once multi-platform publishing is exercised more heavily.
- A cross-user, admin-facing analytics view, if one is ever built — the natural place to finally put the existing, currently-unused `"analytics"`/`"dashboard"` seeded permissions to use.
