# ADR-0007 — ContentProject/GeneratedContent Ownership (Security Hardening)

## Context

`ContentProject` and `GeneratedContent` were the only two content-bearing models in the platform without enforced per-user ownership — any authenticated user could read, list, or delete any other user's project or generated content by ID. ADR-0006 deliberately scoped itself to `SavedPrompt` only and explicitly left this gap open, tracked in `PROJECT_STATE.md` and `tasks/backlog/sprint-4-readiness.md` as the platform's highest-severity technical debt.

Sprint 4.1 (AI Image Studio) was about to hang a new, billable resource (`GeneratedImage`) off `ContentProject`. Building that on top of an ownerless model would have inherited the gap immediately, now on a resource with a real per-generation cost. This was treated as a prerequisite — "Phase 0 — Security Hardening" — completed and deployed before any Image Studio work began.

## Decision

`ContentProject.userId` is a required field (FK to `User`, cascade delete), following the exact pattern ADR-0006 established for `SavedPrompt`: every repository read is scoped to the requesting user's ID, and update/delete verify ownership first, returning `NotFoundError` (not `ForbiddenError`) for a project that exists but isn't the caller's — consistent with how this codebase already avoids leaking existence.

`GeneratedContent` does **not** get its own `userId` column. Its ownership is derived transitively through its parent `ContentProject.userId`, via a Prisma relation filter (`where: { id, project: { userId } }`). This was a deliberate choice over duplicating a second ownership field:

- `GeneratedContent` never exists independently of a `ContentProject` — the relation is already a hard `onDelete: Cascade` foreign key.
- A second `userId` column would be redundant with the parent's and could drift from it (e.g. if a project were ever transferred between users, two ownership fields would need to change in lockstep).
- `ContentProject.userId` becomes the single source of truth for "who owns this data" across both models, which is also the intended shape for Sprint 4.1's `GeneratedImage` and future media types (video, audio, assets) — they all hang off the same project and inherit ownership the same way, rather than each carrying their own ownership column.

`GeneratedContent.createdBy` (pre-existing, nullable) is left as-is — it records who generated a specific piece of content for audit/display purposes, but authorization is never derived from it, since it was optional and unenforced.

## Migration & Backfill

`ContentProject` already had 3 production rows, so the column could not be added as `NOT NULL` directly. The migration (`20260723233309_add_content_project_ownership`) adds it nullable, backfills existing rows, then enforces `NOT NULL` in the same transaction. The backfill target was not guessed: production data was queried directly beforehand, confirming all 3 existing `ContentProject` rows and all 7 existing `GeneratedContent` rows were created by a single real account. That account's ID is the primary backfill target, with a fallback to the earliest-created user if that specific ID isn't present in a given environment (never exercised here — the primary path matched directly). Full reasoning is recorded in the migration file's header comment.

## Alternatives Considered

- **Give `GeneratedContent` its own `userId` column, scoped independently of its project.** Rejected — see above; this creates two sources of truth for the same fact and doesn't match how the relation actually works (content cannot exist without a project).
- **Defer this again and build `GeneratedImage` on the ownerless model, fixing ownership later.** Rejected — this was already deferred once (ADR-0006), and Sprint 4.1 adds a billable resource on top of the same gap, which raises the cost of waiting rather than lowering it.
- **Schema prepared for ownership but not enforced yet (column present, no query filtering).** Rejected for the same reason ADR-0006 rejected it: the column and the `where` clause are the entire cost difference, and a schema that implies privacy without enforcing it is worse than not having the column at all.

## Consequences

`ContentProject` requires an authenticated owner at creation; `userId` is taken only from the authenticated request context (`req.user.id`), never from client-supplied input. `GET /projects`, `GET /projects/:id`, `GET /content`, `GET /content/:id`, and their `DELETE` counterparts are all scoped by the caller's identity. `GET /projects/:id` and `GET /content/:id` now correctly return `404` for a nonexistent or not-owned row (previously `GET /projects/:id` returned `200` with `null` for a nonexistent ID — an incidental bug fixed as part of this change, since the code path was being rewritten anyway).

Sprint 4.1's `GeneratedImage` model inherits ownership through the same `ContentProject.userId` relation, with no additional ownership column needed — validated as correct in this ADR before that work began.

Deployed to production 2026-07-24 (commit `be20870`), validated end-to-end with real HTTP requests against two disposable test accounts covering project creation, project listing, content generation, content history, and cross-user access on both read and delete paths. Full record in `tasks/completed/sprint-3-5-security-hardening.md`.