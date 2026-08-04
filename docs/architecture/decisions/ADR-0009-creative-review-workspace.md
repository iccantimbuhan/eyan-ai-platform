# ADR-0009 — Creative Review Workspace: Unified Comments/Annotations, Informational-Only Assignment

## Context

Sprint 6.3 extends the QA review system Sprint 5 built (`AssetReview`/`AssetVersion`, ADR-0008) with capabilities it didn't have: asset annotations (image regions, video timestamps, general comments), a review timeline, review assignments, internal reviewer notes, and a Revision Requested status. The explicit instruction was to extend the existing review system, not build a second one, and to continue following ADR-0007's ownership model without redesigning it.

Two decisions in this sprint are non-obvious enough to warrant recording.

## Decision 1: Comments and annotations share one table, not two

An "annotation" (an image-region pin or a video-timestamp marker) and a "general comment" are the same thing from the reviewer's point of view — a note attached to an asset, sometimes anchored to a specific spot. Building a separate `AssetAnnotation` table alongside a separate `AssetComment` table would mean two near-identical models, two repositories, two services, and two frontend data flows for what the UI treats as a single thread with an optional anchor.

Instead, `AssetComment(assetType, sourceId, authorId, body, isInternal, regionX/Y/Width/Height, timestampMs, resolvedAt, resolvedBy)` is one table. At most one anchor kind (region or timestamp) is set per row; neither set means a general comment. `isInternal` distinguishes reviewer-only notes from the same table rather than a separate "internal notes" concept — there was no partial existing implementation of internal notes to extend (the only prior "notes" concept, `AssetReview.notes`, is a single last-write-wins scalar, structurally unsuited to be a thread).

This follows ADR-0008's own precedent directly: prefer one polymorphic, additive table over a unified-but-redesigned existing model, and prefer one table over N near-duplicate tables when the data is genuinely the same shape with an optional field.

**Alternative considered and rejected**: separate `AssetAnnotation` (with `region`/`timestampMs`) and `AssetComment` (without) tables. Rejected — it would require the frontend to merge two data sources into one thread view anyway, doubles the repository/service/DTO surface for zero behavioral gain, and the "is this an annotation" question is already fully answered by whether an anchor field is set.

## Decision 2: Review assignment is informational only — it grants no access

This repository has no multi-user project access model. `ContentProject.userId` (ADR-0007) makes every project single-owner; no `Team`, `Organization`, or `WorkspaceMember` table exists, and the sidebar's `TeamSwitcher` is decorative, backed by a hardcoded array. `AssetReview.reviewerId` (Sprint 5) already established that "reviewer" means "whoever called the review endpoint" — there was never a concept of assigning review work to someone else.

Sprint 6.3's "Review Assignments" goal was explicitly scoped by the user, mid-sprint, to informational metadata: `AssetReviewAssignment(assetType, sourceId, assigneeId, assignedById, note)` records who is intended to review an asset — surfaced in the Review Queue, the Asset Detail sheet, and the activity timeline — but the assignee gains **no** access to the project. Every existing ownership check (`AssetService.findSource()`, `ProjectRepository.findById(id, userId)`, etc.) is completely unmodified; an assignee who isn't the project owner still gets a 404 from every asset/project endpoint, exactly as any other non-owner does today.

**Alternatives considered and rejected**:
- **Extend project access** with a new collaborator/membership table so an assignee can actually act on the project. Rejected as out of scope — this is a genuinely new access-control primitive, not an extension of the existing single-owner model, and the user explicitly directed that it be deferred to a dedicated future multi-user/RBAC-expansion sprint.
- **Skip assignment entirely this sprint**, deferring it until real access exists. Rejected — the user confirmed informational-only metadata still has value now (review planning, queue organization, timeline history) even before real collaboration exists.

**Live-validated**: a second throwaway user was assigned as reviewer on a test asset, then confirmed — via that user's own auth token — to receive `404 Not Found` from both `GET /projects/:id` and `GET /assets/:assetType/:sourceId`, proving the assignment carries no access grant.

## Consequences

- `ReviewStatus` gained one value, `REVISION_REQUESTED` (additive enum growth, the same safe pattern used to grow `VideoAssetKind`/`AssetType` in Sprints 6.1/6.2) — no existing row's status changes meaning.
- A new append-only `AssetReviewEvent(type, actorId, fromStatus, toStatus, metadata)` table backs the review timeline, fed as a side-effect from `review()` (status transitions), `regenerate()` (new versions), and the new comment/assignment methods. It is never updated or deleted except by project cascade — a genuine activity log, not a mutable "current state" table like `AssetReview`.
- `AssetService`'s constructor grows to 14 positional arguments after this sprint's four new repositories. Kept consistent with the existing DI convention rather than refactoring to a params object — that refactor is a legitimate future candidate but is unrelated to this sprint's actual goal.
- `AssetSummaryDto`/`AssetDetailDto` gained `commentCount`, `openCommentCount`, and `assignee` fields, batch-fetched in `AssetService.list()`/`getDetail()` alongside review/version — the same in-memory aggregation pattern ADR-0008 already established and documents as a scale boundary.
- Video timestamp annotations are manually-entered logical markers (mm:ss), not synced to actual video playback — no real video file exists to sync against, the same limitation Sprint 6.2 already documented for `SUBTITLES`/`CAPTIONS` timing.
