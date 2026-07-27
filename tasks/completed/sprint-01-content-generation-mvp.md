# Sprint 1 — Content Generator MVP (FEAT-070)

Status: Completed

## Goal

Ship a scoped-down "Content Generator MVP" inside Content Studio: authenticated users can generate, save, view, and delete AI-generated content within a project, reusing the existing AI provider infrastructure rather than building new provider plumbing.

## Scope

### In Scope

- `GeneratedContent` model + migration
- `POST /content/generate`, `GET /content`, `GET /content/:id`, `DELETE /content/:id`
- Reuse of existing `ChatService`, `ProviderFactory`, authentication, validation, and repository patterns
- Minimal generator UI in `ProjectWorkspace`: Prompt Input, Content Type selector, Generate button, Output Viewer, Generation History, loading/error states

### Out of Scope

Prompt Library, Template Library, Provider Selector, multi-provider support, streaming, publishing, image generation, video generation, scheduling.

## What Shipped

- Backend `content` module following the existing `projects` module pattern exactly: DTO, express-validator validator, repository, service, controller, routes, mounted at `/api/v1/content`.
- System prompts per `ContentType` kept in `backend/src/config/content-prompts.ts`, outside the service layer, so future content-generating features can extend the same map without touching provider code.
- Frontend: `GenerateForm`, `OutputViewer`, `GenerationHistory` components wired into `ProjectWorkspace`, replacing a placeholder that previously said "tomorrow we'll build this."
- `GenerateForm.test.tsx` — first test coverage for the content-studio feature area.

## Files Created / Modified

**Backend (created)**: `config/content-prompts.ts`, `dto/content.dto.ts`, `validators/content.validator.ts`, `repositories/content.repository.ts`, `services/content.service.ts`, `controllers/content.controller.ts`, `routes/v1/content.routes.ts`.
**Backend (modified)**: `prisma/schema.prisma`, `src/app.ts` (route registration).
**Frontend (created)**: `types/content.ts`, `api/content.api.ts`, `hooks/use-content.ts`, `hooks/use-generate-content.ts`, `hooks/use-delete-content.ts`, `components/generator/GenerateForm.tsx` (+ test), `OutputViewer.tsx`, `GenerationHistory.tsx`.
**Frontend (modified)**: `pages/project-workspace/ProjectWorkspace.tsx`.

## Database Changes

New `ContentType` enum (`BLOG`, `EMAIL`, `SOCIAL_MEDIA`, `MARKETING_COPY`, `DOCUMENTATION`) and `GeneratedContent` model (projectId FK with cascade delete, type, prompt, output, model, createdBy, timestamps). Migration: `20260723134852_add_generated_content`.

## API Changes

`POST /content/generate`, `GET /content`, `GET /content/:id`, `DELETE /content/:id` — all behind `authenticate`.

## Validation

- Build: pass (backend `tsc`, frontend `tsc -b && vite build`)
- Typecheck: pass
- Lint: pass on new files; backend has no lint script configured (pre-existing repo gap)
- Tests: `GenerateForm.test.tsx` 5/5 pass; full frontend suite 115/119 (4 pre-existing failures in unrelated auth/search-palette tests, confirmed untouched via `git status`)
- Live verification: repository-level persistence (create/find/list/count/delete) verified directly against Postgres. A full live end-to-end generation call could not be completed in the sandbox at the time — Ollama was serving an oversized `qwen2.5-coder:14b` model that didn't respond within several minutes. This became the trigger for Sprint 1.1.

## Decisions Made

- Reuse `ChatService`/`ProviderFactory` as-is for content generation rather than introducing a separate provider abstraction. _See ADR-0001 (to be written in ACF Stage 1 Phase 3)._
- Per-content-type system prompts live in a plain config map, not a database table — kept out of the service layer for future extensibility without being a full Prompt Library.
- `createdBy` stored as a plain nullable scalar rather than a relation, matching the project's current lack of per-user ownership elsewhere.

## Follow-ups for Future Sprints

- `eyan-backend.service` (production) needed a manual redeploy to pick up this sprint's routes — flagged, not actioned.
- Pre-existing bug noted but not fixed (out of scope): `projects.api.ts`'s `toContentProject()` hardcodes `status: 'Draft'` regardless of real backend status.
- Backend has no automated test runner configured — flagged as a gap, not addressed this sprint.
- Prompt Library (FEAT-060) and multi-provider support remain deferred.
