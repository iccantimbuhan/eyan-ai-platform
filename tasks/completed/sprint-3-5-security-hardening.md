# Sprint 3.5 — Security Hardening

Status: Completed

## Goal

Close the platform's highest-severity known technical debt — `ContentProject`/`GeneratedContent` had no per-user ownership, so any authenticated user could read, list, or delete any other user's project or generated content by ID — before starting Sprint 4.1 (AI Image Studio), which would otherwise inherit the gap on a new, billable resource.

## Scope

### In Scope

- Add required `userId` ownership to `ContentProject`, following the exact pattern ADR-0006 established for `SavedPrompt`.
- Scope `GeneratedContent` ownership transitively through its parent project (no second ownership column).
- Scope every affected route/service/repository method by the requesting user's identity.
- Backfill existing production data.
- Unit test coverage for both modules (previously untested).
- Production deployment and live validation.

### Out of Scope

- Sprint 4.1 feature work (Image Studio) — this phase is a prerequisite, not part of it.
- Any change to `SavedPrompt`, `PromptTemplate`, RBAC, or auth itself.
- CI/CD, rate limiting, or other technical debt items tracked separately in `tasks/backlog/sprint-4-readiness.md`.

## What Shipped

- `ContentProject.userId` (required, FK to `User`, cascade delete, indexed).
- `ProjectRepository`, `ProjectsService`, `ProjectsController` scoped by `userId` for list/get/create/update/delete.
- `ContentRepository`, `ContentService`, `ContentController` scoped by `userId` via the parent project relation for generate/list/get/delete.
- Not-found-not-forbidden pattern applied consistently (a row that exists but isn't the caller's returns `404`, matching `SavedPrompt`).
- Incidental fix: `GET /projects/:id` previously returned `200` with `null` data for a nonexistent ID; now correctly returns `404` (the code path was already being rewritten for ownership scoping).
- Removed a stray leftover `console.log` in `ProjectsController.getProjects`.
- New unit tests: `project.repository.test.ts`, `content.repository.test.ts`, `projects.service.test.ts`, `content.service.test.ts` (46 new tests; these modules had zero prior coverage).
- ADR-0007 documenting the ownership model and the decision not to duplicate ownership onto `GeneratedContent`.

## Files Created / Modified

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260723233309_add_content_project_ownership/migration.sql`
- `backend/src/repositories/project.repository.ts`, `backend/src/repositories/content.repository.ts`
- `backend/src/services/projects.service.ts`, `backend/src/services/content.service.ts`
- `backend/src/controllers/projects.controller.ts`, `backend/src/controllers/content.controller.ts`
- `backend/src/dto/project.dto.ts`
- `backend/src/repositories/project.repository.test.ts`, `backend/src/repositories/content.repository.test.ts` (new)
- `backend/src/services/projects.service.test.ts`, `backend/src/services/content.service.test.ts` (new)
- `.claude/decisions/ADR-0007-content-project-ownership.md` (new)

## Database Changes

- `ContentProject.userId` added (required, FK → `User.id`, `onDelete: Cascade`), `@@index([userId])`.
- `User.contentProjects` reverse relation added.
- Migration backfilled the 3 pre-existing `ContentProject` rows by querying production data directly (not guessed): all 3 projects and all 7 pre-existing `GeneratedContent` rows were attributable to a single real account via `GeneratedContent.createdBy`. Full rationale in the migration file header and ADR-0007.

## API Changes

- `GET /projects`, `GET /content` — now return only the requesting user's own rows (previously global).
- `GET /projects/:id`, `GET /content/:id` — now `404` for a nonexistent or not-owned row (previously `200`/`null` for nonexistent on the projects side; previously unscoped on both).
- `DELETE /projects/:id`, `DELETE /content/:id` — now `404` if the row isn't the caller's, no deletion occurs.
- `POST /projects`, `POST /content/generate` — `userId` is taken only from the authenticated JWT (`req.user.id`), never from client-supplied body fields.

## Validation

- Build: pass (`tsc`, backend)
- Typecheck: pass (`tsc --noEmit`)
- Lint: n/a — backend has no lint tooling configured (frontend-only in this repo)
- Tests: 52/52 passing (10 test files, up from 6 pre-existing)
- **Production validation** (2026-07-24, commit `be20870bb299fcd4d202b2377a6d09f44a9e6fd3`, deployed via standard `deploy.sh`): validated live against two disposable test accounts created via the real `/auth/register` endpoint —
  - Health endpoint: healthy
  - Project creation: succeeds (this was the specific regression the migration briefly introduced ahead of code deploy — confirmed fixed)
  - Project listing: correctly scoped (owner sees their project; other user sees an empty list)
  - Content generation: succeeds end-to-end against Ollama (~11s for a short prompt), `createdBy` correctly stamped
  - Content history: correctly scoped (owner sees their content; other user's project-scoped query 404s)
  - Cross-user ownership: verified on `GET`/`DELETE` for both projects and content — non-owner gets `404`, no data leaked or modified
  - Owner's own delete: succeeds, cascade-deletes associated `GeneratedContent` (verified directly in the database)
  - Backend logs (`journalctl -u eyan-backend`): no errors across the full validation window
  - Test data cleaned up after validation (project + content deleted via the API as part of the delete-path test)

## Decisions Made

- `.claude/decisions/ADR-0007-content-project-ownership.md` — ownership model for `ContentProject`, and the decision to derive `GeneratedContent` ownership transitively rather than duplicating a `userId` column.

## Follow-ups for Future Sprints

- Sprint 4.1's `GeneratedImage` model can now safely hang off `ContentProject` and inherit ownership through the same relation, with no separate ownership column — this was the direct motivation for doing this phase first.
- A brief live regression window existed between the migration being applied to production and the corresponding code being deployed (schema required `userId`; the still-running old binary didn't set it on create). Root cause: the operating environment was mistaken for a non-production box when the migration was first run directly against it. No data loss occurred and the window was closed within the same session by deploying the corresponding code; noted here so future migrations against this single-VPS deployment are run only as part of the full `deploy.sh` flow, not applied ad hoc ahead of a code deploy.
- Two disposable validation accounts (`phase0-validation-a@example.com`, `phase0-validation-b@example.com`) remain in the production `User` table with no associated data — consistent with the existing `smoke-test-content@example.com` precedent from a prior session. Harmless, but worth knowing they're there if the user list is ever audited.
- `PROJECT_STATE.md`'s "no CI/CD auto-deploy" and "sudo required for deploy" risks are unchanged by this work and remain open.
