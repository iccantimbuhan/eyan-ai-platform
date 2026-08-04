# Sprint 6.4 — Publishing Pipeline

Status: Completed

## Goal

Fourth phase of Sprint 6 ("Enterprise Creative Production Suite"): add a Publishing Pipeline — the ability to take an approved asset and publish it to an external platform — as a workflow independent of QA review, using a fake publishing provider today with the architecture ready for future real integrations (Facebook, Instagram, LinkedIn, TikTok, YouTube, WordPress). Integrated into the existing Asset Library and Review UI, not a parallel publishing system.

## Scope

### In Scope

- A dedicated `PublishingRecord` model with its own `PublishingStatus` lifecycle (`DRAFT/SCHEDULED/PUBLISHING/PUBLISHED/FAILED/ARCHIVED`), keyed on `(assetType, sourceId, platform)`, gated on but decoupled from `AssetReview.status === "APPROVED"`. `ReviewStatus`/`AssetReview` remain untouched.
- A pluggable platform-provider abstraction (`PlatformProviderFactory`, mirroring `ImageProviderFactory`'s registry shape) with a fake, deterministic provider (`FakePlatformProvider`) as the only registered implementation.
- Scheduling as persisted intent only: a `scheduledFor` timestamp and `SCHEDULED` status, with no background execution — confirmed with the user as an explicit scope decision.
- Publish/retry/archive actions, all feeding the existing `AssetReviewEvent` timeline via four new event types.
- Full integration into `AssetDetailSheet` (new Publishing tab) and a new, separate `PublishingQueue` component alongside `ReviewQueue`.

### Out of Scope (explicit, deferred)

- Any background execution engine (queue, cron, in-process poller) — confirmed with the user mid-sprint. `AssetService.publish()` is designed as the stable core a future executor can call unchanged, but no executor exists yet.
- Real platform integrations (Facebook, Instagram, LinkedIn, TikTok, YouTube, WordPress) — only the fake provider is registered.
- A new "Publisher"/"Reviewer" RBAC role — the new endpoints stay `authenticate`-only, matching every existing asset route.
- Per-attempt historical rows on `PublishingRecord` — history of what happened lives in the existing `AssetReviewEvent` timeline instead.

## What Shipped

**Data model** — one new, purely additive table (`PublishingRecord`), keyed on `(assetType, sourceId, platform)` (`@@unique`, upsert-style like `AssetReviewAssignment`), plus a new `PublishingStatus` enum and four new `ReviewEventType` values (`PUBLISH_SCHEDULED`, `PUBLISH_STARTED`, `PUBLISHED`, `PUBLISH_FAILED`) — additive enum growth, the same safe pattern already used for `REVISION_REQUESTED`. Zero changes to `ReviewStatus`, `AssetReview`, or any other existing model's shape.

**Provider abstraction** — `PlatformProvider` interface (`publish(request): Promise<{externalId, externalUrl}>`), `PlatformProviderFactory` (a `Map`-based registry — `register`/`create`/`listRegistered`/`reset` — mirroring `ImageProviderFactory` rather than the single-hardcoded-provider `ProviderFactory`, since real publishing targets are known future candidates unlike the hardware-constrained single-AI-vendor case), `FakePlatformProvider` (deterministic, no network calls, registered under `"fake"`), `registerPlatformProviders()` called once at boot alongside `registerImageProviders()`.

**Backend** — new `PublishingRecordRepository` (mirrors the existing polymorphic-repository shape: `upsert`, `update`, `findOne`, `findManyBySource`, `findManyBySourceIds`). `AssetService` extended in place, not a parallel service: six new public methods (`listPublishingRecords`, `schedulePublish`, `publish`, `retryPublish`, `archivePublish`), all reusing the existing private `findSource()` ownership-check helper and a new `requireApproved()` helper. `publish()` is the single, stable core — schedulePublish/retryPublish/the "Publish Now" UI action all funnel through it or its gate. Failure handling mirrors `ImageService.generate()`'s stage-based, persist-then-throw convention exactly: a caught failure sets `status: FAILED`, a sanitized `errorMessage`, and an incremented `attempts`, before throwing a generic `PublishingFailedError` — the raw error never reaches the HTTP response. `list()`/`getDetail()` batch-fetch publishing records alongside the existing review/version/comments/assignment batch fetches, surfacing a new `publishing: {platform, status}[]` field on `AssetSummaryDto`/`AssetDetailDto`; `GET /assets` gained an optional `publishingStatus` filter, applied in-memory like every other list filter. Five new endpoints under `/api/v1/assets/:assetType/:sourceId/publishing...`, all `authenticate`-gated only, matching every existing asset route.

**Frontend** — new `components/publishing/` subfolder: `PublishDialog` (platform picker + optional schedule date/time; "Publish Now" composes `schedulePublish` then `publish` as two independent mutations, matching `RequestRevisionDialog`'s established pattern), `PublishingStatusPanel` (lists each platform's current record with status badge, scheduled time, published link, error message, and Publish Now/Retry/Archive actions), `PublishingQueue` (a deliberate sibling to `ReviewQueue`, not a merged tab bar — built on the identical `useAssets(projectId, filters)` hook with a `publishingStatus` filter instead of `status`). `AssetDetailSheet.tsx` gained a Publishing tab; `ProjectWorkspace.tsx` gained a Publishing tab alongside Review.

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260727131709_add_publishing_pipeline/`, `providers/interfaces/platform-provider.ts`, `providers/platform-provider.factory.ts` (+test), `providers/register-platform-providers.ts` (+test), `providers/fake/fake-platform.provider.ts` (+test), `repositories/publishing-record.repository.ts` (+test), `dto/publishing.dto.ts`, `errors/publishing.error.ts`.

**Backend — modified:** `prisma/schema.prisma` (+`PublishingStatus` enum, +4 `ReviewEventType` values, +`PublishingRecord` model, +relation fields on `User`/`ContentProject`), `app.ts` (+`registerPlatformProviders()` call), `dto/asset.dto.ts` (+`publishing` on `AssetSummaryDto`, +`publishingStatus` on `ListAssetsQueryDto`), `dto/asset.mapper.ts` (+`PublishingSummary` type, `baseFields()` threading it through all 10 summary/detail mapper functions), `services/asset.service.ts` (+2 new repo/factory deps, +6 new methods, `list()`/`getDetail()`/`toDetailDto()` thread the publishing summary, +many new test cases), `controllers/asset.controller.ts` (+5 actions), `routes/v1/asset.routes.ts` (+5 routes), `validators/asset.validator.ts` (+`schedulePublishValidator`/`platformParamValidator`, +`publishingStatus` query validation).

**Frontend — new:** `types/publishing.ts`, `api/publishing.api.ts`, `hooks/use-asset-publishing.ts`, `components/publishing/` (`PublishDialog`, `PublishingStatusPanel`, `PublishingQueue`, each with a `.test.tsx`).

**Frontend — modified:** `types/asset.ts` (+`publishing` on `AssetSummary`, +`publishingStatus` on `ListAssetsParams`), `types/review-workspace.ts` (+4 `ReviewEventType` values), `components/review-workspace/ReviewTimeline.tsx` (+4 event icons/descriptions), `components/assets/AssetDetailSheet.tsx` (+Publishing tab), `pages/project-workspace/ProjectWorkspace.tsx` (+Publishing tab), `components/assets/AssetCard.test.tsx`/`AssetDetailSheet.test.tsx`/`AssetLibrary.test.tsx`/`ReviewQueue.test.tsx` (fixture updates for the new `AssetSummary.publishing` field).

**Docs:** `docs/architecture/decisions/ADR-0010-publishing-pipeline.md` (new), `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added.

## Database Changes

Migration `20260727131709_add_publishing_pipeline` (Prisma-generated via `prisma migrate dev` against the real development database, not hand-authored): `ReviewEventType` gains 4 values (additive, via `ALTER TYPE ... ADD VALUE`); new `PublishingStatus` enum; new `PublishingRecord` table (owned by `ContentProject` via `projectId`, cascade delete; `createdBy` references `User`, cascade delete). Fully additive — no existing column altered or dropped, no backfill needed. `prisma migrate status` confirmed clean after applying.

## API Changes

New, all under `/api/v1/assets/:assetType/:sourceId/publishing...` (all `authenticate`-gated, scoped by project ownership via the existing `findSource()` check):
- `GET /publishing` — list every platform's publishing record for this asset.
- `PUT /publishing/:platform` — schedule (or update) a publish target; requires `AssetReview.status === "APPROVED"`. Body: optional `scheduledFor` (ISO 8601, must be in the future).
- `POST /publishing/:platform/publish` — publish immediately via the registered provider; requires `APPROVED`.
- `POST /publishing/:platform/retry` — retry a `FAILED` record (400 otherwise).
- `DELETE /publishing/:platform` — archive a record (bookkeeping only, no provider call).

Existing endpoints: `GET /assets` gained an optional `publishingStatus` query filter. `GET /assets`/`GET /assets/:assetType/:sourceId` responses now include `publishing: {platform, status}[]`.

## Validation

- Build: clean (backend `tsc`; frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step (matches existing convention); frontend `eslint` clean on every file this phase touched or added — repo-wide lint unchanged from baseline (confirmed no `publishing`-related file in the lint output).
- Tests: backend 413/413 passing (new: `publishing-record.repository.test.ts`, `platform-provider.factory.test.ts`, `fake-platform.provider.test.ts`, `register-platform-providers.test.ts`, plus new `asset.service.test.ts` cases covering the approval gate, successful publish, provider-failure handling, retry-only-from-FAILED, archive, and `list()`/`getDetail()` publishing-summary surfacing — against the pre-Sprint-6.4 baseline of 384). Frontend: full suite runs to completion — 308/312 passing, 4 failing, all 4 the same pre-existing `search-provider.test.tsx`/`user-auth-form.test.tsx` baseline failures in files this phase never touched (confirmed via `git status` on those paths); 12 new tests across the 3 new `components/publishing/` test files, all passing; `AssetDetailSheet.test.tsx`/`AssetCard.test.tsx`/`AssetLibrary.test.tsx`/`ReviewQueue.test.tsx` re-verified passing with updated fixtures.
- Live validation (2026-07-27, against the real EYAN Studio development database and backend on a throwaway project + user, cascade-deleted afterward): confirmed both `schedulePublish` and `publish` reject a non-`APPROVED` asset with a clear 400; approved an asset and scheduled a future publish, confirming `SCHEDULED` status and — checked explicitly — that nothing executes it automatically; published immediately via the fake provider, confirming `PUBLISHED` status with `externalId`/`externalUrl` populated; confirmed the Review Timeline shows `STATUS_CHANGED → PUBLISH_SCHEDULED → PUBLISH_STARTED → PUBLISHED` in correct chronological order; confirmed `GET /assets`/`getDetail` surface the `publishing` summary and that `GET /assets?publishingStatus=` filters correctly; exercised the failure path against an unregistered platform, confirming `FAILED` status, a captured `errorMessage`, and `attempts` incremented — **this caught a real bug** (see Decisions Made) that a first validation pass surfaced and a fix resolved, re-validated after the fix; confirmed retry only succeeds from `FAILED` (404 otherwise) and archive sets `ARCHIVED` without adding a new timeline event. Regression: content generation, brand kit creation, asset library listing, and Sprint 6.3 comments all confirmed still working unchanged. All test data cleaned up afterward — verified zero leftover rows for the test project/users.

## Decisions Made

- **Publishing gets its own `PublishingRecord`/`PublishingStatus`, decoupled from but gated on `AssetReview.status === "APPROVED"`** — confirmed with the user as the sprint's core architectural direction. See ADR-0010, Decision 1.
- **`PlatformProviderFactory` mirrors `ImageProviderFactory`'s registry shape, not `ProviderFactory`'s single-hardcoded-provider shape** — real publishing targets are known future candidates, unlike the hardware-constrained single-AI-vendor case ADR-0001 documents. See ADR-0010, Decision 2.
- **Scheduling is persisted intent only, no background execution — confirmed with the user mid-sprint.** No queue/cron/worker infrastructure exists anywhere in this codebase (confirmed by research), and ADR-0005 already documents a deliberate prior decision to keep generation synchronous. `AssetService.publish()` is deliberately the single, stable entry point a future executor could call unchanged, but building that executor was explicitly out of scope this sprint. See ADR-0010, Decision 3.
- **Bug found and fixed during live validation**: `platformProviderFactory.create(platform)` was originally called *before* the `try`/`catch` block in `AssetService.publish()`, so an unregistered platform threw outside the failure-handling path — leaving the record stuck at `PUBLISHING` forever instead of transitioning to `FAILED`, with no `PUBLISH_FAILED` event ever written. Fixed by moving the `create()` call inside the `try` block, so a provider-lookup failure is handled identically to a provider-execution failure. Caught by the live validation script's failure-path assertion, not by the unit tests (which inject an already-resolved fake provider and never exercise `create()` throwing) — re-validated end-to-end after the fix; all 413 backend tests still pass.
- **`archivePublish` writes no new timeline event** — archiving is administrative bookkeeping, not a QA- or publish-relevant state transition worth growing `ReviewEventType` for.
- **No new RBAC gate on the five new endpoints.** They stay `authenticate`-only, matching every existing asset route and ADR-0009's precedent that this repo's global RBAC governs page-level access, not per-resource collaboration.
- **`PublishingQueue` is a new, separate frontend component from `ReviewQueue`**, not a merged tab bar with two status dimensions — keeps QA and Publishing visually and conceptually distinct, per the "two independent but connected workflows" direction.

## Follow-ups for Future Sprints

- Real background execution (a queue, poller, or cron-triggered endpoint) that calls the existing `AssetService.publish()` core automatically for due `SCHEDULED` records — the explicitly deferred piece of this sprint.
- Real platform integrations (Facebook, Instagram, LinkedIn, TikTok, YouTube, WordPress), registered against the existing `PlatformProviderFactory` with no changes to `AssetService` or its routes.
- Per-attempt historical rows on `PublishingRecord`, if the existing `AssetReviewEvent` timeline proves insufficient for publishing history/audit needs.
- Sprint 6.5 (Analytics Foundation) — per the approved Sprint 6 plan.
