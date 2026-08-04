# Sprint 6.3 — Creative Review Workspace

Status: Completed

## Goal

Third phase of Sprint 6 ("Enterprise Creative Production Suite"): extend the QA review system Sprint 5 built (`AssetReview`/`AssetVersion`, ADR-0008) with asset annotations (image regions, video timestamps, general comments), a review timeline, review assignments, internal reviewer notes, and a Revision Requested workflow — all integrated into the existing Asset Library and Review UI, none of it a second review system.

## Scope

### In Scope

- Asset annotations: image-region pins (normalized 0–1 coordinates), video-timestamp markers, and general asset comments — unified in one `AssetComment` table (ADR-0009).
- Internal reviewer notes: an `isInternal` flag on `AssetComment`, distinguishing reviewer-only notes from the same thread rather than a separate concept.
- Review timeline: an append-only `AssetReviewEvent` log covering status changes, comments/annotations, resolutions, assignment changes, and new versions.
- Review assignments: `AssetReviewAssignment`, **informational only** — records intent for review planning/queue organization/timeline history, grants no project access.
- Revision Requested workflow: `ReviewStatus.REVISION_REQUESTED` (additive enum growth), a "Request Revision" dialog that records the reason as a comment and sets the status.
- Full integration into the existing `AssetDetailSheet` (reorganized into Details/QA/Comments/Timeline tabs) and `ReviewQueue` (new status tab, assignee/comment badges, "My assignments" filter).

### Out of Scope (explicit, deferred)

- Real project access/collaboration for assignees — explicitly confirmed with the user mid-sprint as a future, dedicated multi-user/RBAC-expansion sprint. See Decisions Made.
- A new "Reviewer" RBAC role/permission gate on the new endpoints — they stay `authenticate`-only, matching every existing asset route.
- Synced video timestamp playback — no real video file exists to sync against; timestamps are manually-entered logical markers, the same limitation Sprint 6.2 already documented for `SUBTITLES`/`CAPTIONS`.
- Threaded comment replies — comments are a flat list per asset, not a nested thread.

## What Shipped

**Data model** — three new, purely additive tables, all keyed on `(assetType, sourceId)` exactly like `AssetReview`/`AssetVersion`, none touching `GeneratedContent`/`GeneratedImage`/`VideoAsset`/`BrandKit` shape: `AssetComment` (general comments and annotations, unified — see ADR-0009), `AssetReviewAssignment` (informational-only assignment), `AssetReviewEvent` (append-only activity log, new `ReviewEventType` enum). `ReviewStatus` gained one new value, `REVISION_REQUESTED` — additive enum growth, the same safe pattern already used to grow `VideoAssetKind`/`AssetType`.

**Backend** — three new repositories (`asset-comment.repository.ts`, `asset-review-assignment.repository.ts`, `asset-review-event.repository.ts`), each mirroring `AssetReviewRepository`'s shape (batch `findManyBySourceIds`, no-op-safe `deleteMany`). `AssetService` extended in place, not a parallel service: seven new public methods (`addComment`, `listComments`, `resolveComment`, `deleteComment`, `assignReviewer`, `unassignReviewer`, `getTimeline`), all reusing the existing private `findSource()` ownership-check helper directly. Two existing methods gained a side-effect: `review()` now writes a `STATUS_CHANGED` event when the status actually changes (reads the prior status first, same read-before-write shape `findSource()` already uses); `regenerate()` now writes a `VERSION_CREATED` event on the **new** source id. `list()`/`getDetail()` batch-fetch comment counts and assignments alongside the existing review/version batch fetches, so `AssetSummaryDto`/`AssetDetailDto` carry `commentCount`, `openCommentCount`, and `assignee` without a second round trip per card. Seven new endpoints under `/api/v1/assets/:assetType/:sourceId/...` (comments CRUD + resolve, assignment PUT/DELETE, timeline GET), all `authenticate`-gated only, matching every existing asset route.

**Frontend** — new `components/review-workspace/` subfolder: `CommentThread` (general/annotation-filtered list + composer), `ImageAnnotationOverlay` (click-drag rectangle drawing via plain absolutely-positioned divs over the image, no canvas dependency), `VideoTimestampAnnotations` (mm:ss input + list, sorted), `AssigneePicker` (reuses the existing admin `getUsers()`/`useUsers()` as the assignable pool), `ReviewTimeline` (read-only, one row per event with a human-readable description), `RequestRevisionDialog` (two independent mutations from one button: add comment, then set status). `AssetDetailSheet.tsx` reorganized into an internal `Tabs` (Details/QA/Comments/Timeline) to keep the growing sheet navigable — a UI-only refactor, no change to its data-fetching contracts beyond the new hooks. `ReviewQueue.tsx` gained a `REVISION_REQUESTED` tab, assignee/comment-count badges per row, and a "My assignments" filter — the first place Content Studio wires into `useAuthStore` for the current user's identity.

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260727101319_add_creative_review_workspace/`, `dto/review-workspace.dto.ts`, `repositories/asset-comment.repository.ts` (+test), `repositories/asset-review-assignment.repository.ts` (+test), `repositories/asset-review-event.repository.ts` (+test).

**Backend — modified:** `prisma/schema.prisma` (+`ReviewStatus.REVISION_REQUESTED`, +`ReviewEventType` enum, +3 models, +relation fields on `User`/`ContentProject`), `dto/asset.dto.ts` (+`commentCount`/`openCommentCount`/`assignee` on `AssetSummaryDto`), `dto/asset.mapper.ts` (+`CommentStats`/`AssigneeRef` types, `baseFields()` threading them through all 5 summary/detail mapper pairs), `services/asset.service.ts` (+4 new repo deps, +7 new methods, `review()`/`regenerate()` gain event side-effects, `list()`/`getDetail()`/`toDetailDto()` thread comment stats/assignee, +69 new test cases), `controllers/asset.controller.ts` (+7 actions), `routes/v1/asset.routes.ts` (+7 routes), `validators/asset.validator.ts` (+`createCommentValidator`/`commentIdParamValidator`/`assignReviewerValidator`).

**Frontend — new:** `types/review-workspace.ts`, `api/review-workspace.api.ts`, `hooks/use-asset-comments.ts`, `use-asset-assignment.ts`, `use-asset-timeline.ts`, `components/review-workspace/` (`CommentThread`, `ImageAnnotationOverlay`, `VideoTimestampAnnotations`, `AssigneePicker`, `ReviewTimeline`, `RequestRevisionDialog`, each with a `.test.tsx`).

**Frontend — modified:** `types/asset.ts` (+`REVISION_REQUESTED`, +`commentCount`/`openCommentCount`/`assignee` on `AssetSummary`), `components/assets/AssetDetailSheet.tsx` (Tabs reorganization + new panels, `.test.tsx` updated), `components/assets/ReviewQueue.tsx` (+status tab, badges, "My assignments" filter), `components/assets/AssetStatusBadge.tsx` (+`REVISION_REQUESTED` case), `components/assets/AssetCard.test.tsx`/`AssetLibrary.test.tsx`/`ReviewQueue.test.tsx` (fixture updates for the 3 new `AssetSummary` fields).

**Docs:** `docs/architecture/decisions/ADR-0009-creative-review-workspace.md` (new), `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added.

## Database Changes

Migration `20260727101319_add_creative_review_workspace` (Prisma-generated via `prisma migrate dev` against the real development database, not hand-authored): `ReviewStatus` gains `REVISION_REQUESTED` (additive enum value, via `ALTER TYPE ... ADD VALUE`); new `ReviewEventType` enum; new `AssetComment`, `AssetReviewAssignment`, `AssetReviewEvent` tables (all owned by `ContentProject` via `projectId`, cascade delete). Fully additive — no existing column altered or dropped, no backfill needed. `prisma migrate status` confirmed clean after applying.

## API Changes

New, all under `/api/v1/assets/:assetType/:sourceId/...` (all `authenticate`-gated, scoped by project ownership via the existing `findSource()` check):
- `GET /comments` — list comments (general + annotations).
- `POST /comments` — create a comment or annotation (`body`, optional `isInternal`, optional `region` xor `timestampMs`).
- `PATCH /comments/:commentId/resolve` — mark resolved.
- `DELETE /comments/:commentId` — delete.
- `PUT /assignment` — assign (or reassign) a reviewer (`assigneeId`, optional `note`).
- `DELETE /assignment` — unassign.
- `GET /timeline` — the review activity log for this asset.

Existing endpoints: `PATCH .../review`'s `status` field now accepts `REVISION_REQUESTED` (validator already checks against the full `ReviewStatus` enum, so this required no validator change beyond the enum growing). `GET /assets` and `GET /assets/:assetType/:sourceId` responses now include `commentCount`, `openCommentCount`, and `assignee`.

## Validation

- Build: clean (backend `tsc`; frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step (matches existing convention); frontend `eslint` clean on every file this phase touched or added — repo-wide lint unchanged from baseline.
- Tests: backend 384/384 passing (69 new — `asset-comment.repository.test.ts` 8, `asset-review-assignment.repository.test.ts` 5, `asset-review-event.repository.test.ts` 2, `asset.service.test.ts` +54 new cases across `review()`'s event side-effect, `regenerate()`'s event side-effect, `list()`/`getDetail()`'s comment/assignee surfacing, and the 7 new methods — against the pre-Sprint-6.3 baseline of 315). Frontend: full suite runs to completion — 296/300 passing, 4 failing, all 4 the same pre-existing `search-provider.test.tsx`/`user-auth-form.test.tsx` baseline failures in files this phase never touched (confirmed via `git status` on those paths); 20 new tests across the 6 new `review-workspace/` component test files, all passing; `AssetDetailSheet.test.tsx`/`ReviewQueue.test.tsx`/`AssetCard.test.tsx`/`AssetLibrary.test.tsx` re-verified passing with updated fixtures/assertions.
- Live validation (2026-07-27, against the real EYAN Studio development database and backend, on a throwaway project + two throwaway users, cascade-deleted afterward): created a general comment, an image-region annotation, and a video-timestamp annotation on real generated assets (a BLOG content item, a fake-provider image, and a live-Ollama `SCRIPT` video asset); resolved the region annotation and confirmed `openCommentCount` dropped from 2 to 1 while `commentCount` stayed 2; assigned a second real user as reviewer and — using that user's own auth token — confirmed `GET /projects/:id` and `GET /assets/IMAGE/:id` both returned `404`, proving the informational-only assignment decision actually holds (the assignee gained no access); unassigned; walked a content asset through `NEEDS_REVIEW → REVISION_REQUESTED` (with a recorded reason comment) `→ regenerate (new version) → APPROVED` and confirmed the timeline for the original asset shows `STATUS_CHANGED → COMMENT_ADDED → STATUS_CHANGED` while the timeline for the newly-regenerated version shows its own `VERSION_CREATED → STATUS_CHANGED`, correctly not inheriting the old asset's history. Regression: version history (2 entries), QA checklist/notes/qaScore save, video-asset duplicate, and brand-kit creation all confirmed still working unchanged. All test data (2 users, 1 project, and everything cascading from it) cleaned up afterward — verified zero leftover rows across `AssetComment`/`AssetReviewAssignment`/`AssetReviewEvent`/`User` for the test emails.

## Decisions Made

- **Comments and annotations share one `AssetComment` table**, not a separate `AssetAnnotation` table — an annotation is just a comment with an anchor (`region*` or `timestampMs`) set. Avoids two near-identical models/repositories/services for what the UI treats as a single thread. See ADR-0009.
- **Review assignment is informational only — confirmed with the user mid-sprint.** This repository has no multi-user project access model (`ContentProject.userId`, ADR-0007, single-owner); assigning a reviewer records intent for review planning/queue organization/timeline history but grants zero access. The project owner remains the only user who can view or act on a project. Real project collaboration/membership is explicitly deferred to a future, dedicated multi-user/RBAC-expansion sprint — not built, not stubbed, not implied by this sprint's schema. Live-validated directly (see Validation).
- **No new RBAC gate on the seven new endpoints.** They stay `authenticate`-only, matching every existing asset route — this repo's global RBAC (`requirePermission`/`requireRole`) governs page-level feature access (e.g. `models.read`), not per-resource collaboration, and is applied nowhere in the asset module today. Adding a "Reviewer" role/permission for this sprint's endpoints alone would be inconsistent with that existing pattern.
- **`deleteComment` is ownership-scoped to the asset, not per-comment-author.** Since only the project owner can ever call these endpoints (informational-only assignment means the assignee has no access), an "only the author can delete" check would be dead code this sprint — noted so it isn't mistaken for an oversight later.
- **`VERSION_CREATED` is written against the new source id, not the old one.** Matches how `AssetVersion` itself already treats a regeneration as producing a genuinely new row — the old asset's timeline reflects only what actually happened to that row; the new asset's timeline starts fresh with the version-creation event.
- **`AssetDetailSheet.tsx` reorganized into internal Tabs** (Details/QA/Comments/Timeline) rather than one long scroll — a UI-only refactor of one already-growing file, validated by its existing test suite plus new panel coverage, not a change to its data-fetching contracts.

## Follow-ups for Future Sprints

- Real project collaboration/membership — the dedicated multi-user/RBAC-expansion sprint that would let a `AssetReviewAssignment` assignee actually access the project they're assigned to.
- A "Reviewer" RBAC role, if per-resource collaboration gating is ever wanted beyond the existing page-level RBAC.
- Threaded comment replies, if flat per-asset comments prove insufficient.
- Sprint 6.4 (Publishing Pipeline) — per the approved Sprint 6 plan.
