# ADR-0006 — SavedPrompt Ownership Is Enforced Per-User

## Context

Sprint 3 introduces `SavedPrompt` (Prompt Library), the first genuinely personal, user-created data in Content Studio. Every model shipped so far is either global/seeded (`PromptTemplate`) or ownerless (`ContentProject`, `GeneratedContent` — the latter has an optional `createdBy` that exists but is never used to filter or authorize anything). Full JWT auth and RBAC already exist (`User`, `Role`, `Permission`), `authenticate` middleware is already applied to every Content Studio route, and `req.user.id` is already read today in `ContentController.generateContent` — so the cost of "know who's asking" is already paid. The open question was whether `SavedPrompt` uses that identity to scope data.

## Decision

`SavedPrompt.userId` is a required field (FK to `User`). Every repository read is scoped to the requesting user's ID; every update/delete verifies the row belongs to the requesting user before mutating it, returning not-found (not forbidden) for a prompt that exists but isn't theirs — consistent with how `NotFoundError` is already used elsewhere in this codebase rather than leaking existence.

This decision governs `SavedPrompt` only. It does **not** retrofit ownership onto `ContentProject` or `GeneratedContent` — that pre-existing gap (flagged in the Sprint 2 Retrospective) remains explicitly out of scope for Sprint 3 and is tracked separately in `PROJECT_STATE.md`.

## Alternatives Considered

- **Single-tenant Prompt Library** (no `userId` at all — every authenticated user sees/edits/deletes every saved prompt, like `PromptTemplate` today). Rejected: this contradicts the feature's own premise. A "library" that isn't personal isn't Prompt Library, it's a second user-writable `PromptTemplate` table. Retrofitting ownership later would mean a breaking migration on a populated table with no way to infer who owned what.
- **Schema prepared for future ownership, not enforced today** (`userId` column present but no query filters or authorizes by it yet). Rejected: this only looks like a middle ground. The column and the `where: { userId }` clause are the entire cost difference versus full enforcement — there is no meaningful effort saved. It ships a schema that implies privacy it doesn't provide: any user could still read, edit, or delete any other user's saved prompts through the API. That's a worse outcome than the single-tenant option, which at least doesn't imply protection it lacks.

## Consequences

`SavedPrompt` requires an authenticated user at creation — no anonymous/unowned rows. This is the first place in Content Studio's domain where authorization is real rather than "authenticated but ownerless," using infrastructure (JWT auth, `req.user.id`) that already existed for other features. No change to any other model, to `authenticate` middleware, or to the RBAC system. Applying this same standard to `ContentProject`/`GeneratedContent` remains a separate, not-yet-made decision.
