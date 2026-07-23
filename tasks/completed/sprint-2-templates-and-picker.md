# Sprint 2 — Content Studio: Templates & Generation UX

Status: Completed

## Goal

Improve the Content Studio generation experience via Prompt Templates, a Template Picker, and better loading/empty/error states — while keeping the existing AI generation flow (`GenerateForm → ContentController → ContentService → ChatService → ProviderFactory → OllamaProvider`) completely unchanged.

## Scope

### In Scope

Prompt Templates, Prompt Variables, Template Picker, Template Preview panel, GenerateForm improvements, better loading/empty/error states, mobile responsiveness, "remember last selected template" and "recently used templates" via `localStorage` only.

### Out of Scope

Prompt Library, Version History, Rename Generated Content, Restore Previous Versions, Soft Delete, Output Editor, Export, AI Gateway, Background Jobs, Streaming, Image Generation, Video Generation.

This is a deliberately cut-down scope — a broader Sprint 2 plan (Prompt Library, versioning, rename/restore, soft delete, Output Editor, export) was proposed first and explicitly split into future sprints to keep this one small and independently deployable.

## What Shipped (all 4 phases)

**Phase 1 — Database, seed, backend endpoint**: `PromptTemplate` model reusing the existing `ContentType` enum (no new enum, no separate `PromptCategory` table). Seeded 9 default templates across 4 categories (Blogging, Social Media, Marketing, Business Communication). Read-only `GET /prompt-templates` endpoint with optional `category`/`contentType` filters, following the existing thin-service pattern (no CRUD — creating/editing templates is Prompt Library, deferred).

**Phase 2 — Frontend API, hook, Template Picker, Template Preview**: `useTemplates()` hook (fetches the full small catalog once, client-side category filtering). `TemplateCard` and `TemplatePreview` as pure/tested presentational components; `TemplatePicker` as a self-fetching container mirroring the existing `RecentProjects` pattern, with category tabs. Not yet wired into `GenerateForm`.

**Phase 3 — Variable substitution and GenerateForm integration**: `extractVariables()`/`substituteVariables()` (`lib/prompt-variables.ts`) parse `{{token}}` placeholders and fill them in client-side, so `POST /content/generate` needed zero changes (confirms ADR-0004). `VariableForm` renders one input per parsed variable. `GenerateForm` now branches on selection: picking a real template swaps in `TemplatePreview` + `VariableForm` with the content type auto-derived from the template; picking nothing or "Custom Prompt" reproduces the original free-text + manual content-type flow exactly. `useRecentTemplates()` persists the last-selected template and a 5-item most-recently-used list to `localStorage` (the "Custom Prompt" sentinel is remembered as last-selected but never appears in recents). `TemplatePicker` gained a "Recent" tab and a one-time auto-restore of the last-selected template on load. Loading/empty/error states polished across `TemplatePicker` (skeleton grid), `OutputViewer` (real empty-state placeholder instead of `return null`), and `GenerationHistory` (skeleton, friendlier empty/error copy).

**Phase 4 — Mobile polish, test coverage, cleanup, sprint closeout**: Targeted mobile fixes — full-width Generate button on small screens, wrapping/truncation fixes for long template names and long generated-content prompts so they can't overflow their containers on narrow viewports. Small justified cleanup in `GenerateForm` removing two non-null assertions (`selectedTemplate!`) in favor of a control-flow-narrowed branch. Added test coverage that was deferred from Phase 3: `TemplatePicker` (tab filtering, Recent tab visibility, auto-restore behavior — justified despite the "self-fetching containers stay untested" convention because it carries real branching logic, not just fetch-and-delegate), `useRecentTemplates` (persistence, recency ordering, 5-item cap, custom-prompt exclusion), and `OutputViewer` (pending/empty/populated states). `GenerationHistory` was left untested, consistent with the existing convention that plain fetch-and-delegate containers (mirroring `RecentProjects`) don't get their own tests.

## Files Created / Modified (all phases)

**Backend (created)**: `dto/prompt-template.dto.ts`, `repositories/prompt-template.repository.ts`, `services/prompt-template.service.ts`, `controllers/prompt-template.controller.ts`, `validators/prompt-template.validator.ts`, `routes/v1/prompt-templates.routes.ts`.
**Backend (modified)**: `prisma/schema.prisma`, `prisma/seed.ts`, `src/app.ts`.

**Frontend (created)**: `types/prompt-template.ts`, `api/prompt-templates.api.ts`, `hooks/use-templates.ts`, `hooks/use-recent-templates.ts` (+ test), `lib/prompt-variables.ts` (+ test), `components/generator/TemplateCard.tsx` (+ test), `TemplatePreview.tsx` (+ test), `TemplatePicker.tsx` (+ test), `VariableForm.tsx` (+ test), `OutputViewer.test.tsx`.
**Frontend (modified)**: `components/generator/GenerateForm.tsx` (+ test), `OutputViewer.tsx`, `GenerationHistory.tsx`, `TemplatePreview.tsx` (mobile wrap fix).

No backend files were touched in Phases 3–4 — both were pure frontend integration, polish, and testing, exactly as scoped.

## Database Changes

New `PromptTemplate` model (id, name [unique], category, contentType, promptBody, timestamps), indexed on category. Migration: `20260723153636_add_prompt_template`. No changes to `GeneratedContent` or `ContentProject`. No further database changes in Phases 3–4.

## API Changes

`GET /prompt-templates` only — no pagination (small fixed catalog), `authenticate` only (nothing user-owned yet). No POST/PATCH/DELETE. `POST /content/generate` remains byte-for-byte unchanged; templates and variables are resolved entirely client-side before that call.

## Frontend Changes

- New generation flow: **Choose a Starting Point** (Template Picker with All/Recent/category tabs) → template preview + dynamic variable inputs (or the untouched custom-prompt form) → Generate.
- Generate button now also gates on all template variables being filled in, in addition to the pre-existing free-text-prompt gate.
- `localStorage` keys: `content-studio:last-template-id`, `content-studio:recent-template-ids` (max 5, custom prompt excluded from recents by design).
- Mobile: full-width primary action button below the `sm` breakpoint; long template names and long generated prompts wrap instead of overflowing their card.

## Validation (final, through Phase 4)

- Build: pass (backend + frontend, `tsc -b` + Vite)
- Typecheck: pass
- Lint: pass on all new/modified files (2 pre-existing `no-console` errors remain in untouched `use-projects.ts`, unrelated to this sprint)
- Tests: Content Studio suite 42/42 pass across 8 files (`GenerateForm`, `VariableForm`, `TemplateCard`, `TemplatePreview`, `TemplatePicker`, `OutputViewer`, `prompt-variables`, `use-recent-templates`). Full frontend suite: 152/156 pass — the 4 failures are pre-existing, unrelated `user-auth-form.test.tsx` flakiness (confirmed via `git status` showing zero files touched under `src/features/auth`, and by reproducing the same 2 failures in isolation before this sprint's work began).
- Manual/live-browser testing: not performed against a running dev server this sprint — no interactive browser tool was available in-session. In its place, all new and modified components were exercised end-to-end in real Chromium via `vitest-browser-react` + Playwright (not jsdom), including simulated clicks, typed input, and tab switching. Flagged as a real gap relative to this project's usual practice of live-testing UI changes before calling a sprint done.
- Accessibility: no regressions — existing `Label`/`htmlFor` pairing preserved and extended to all new variable inputs (`VariableForm`), `TemplateCard` keeps its `role="button"`/`aria-pressed`/keyboard-activation behavior unchanged, Radix `Tabs`/`Select` primitives (already accessible by default) are reused rather than replaced.

## Decisions Made

- "Custom Prompt" is a frontend-only sentinel option, not a seeded database row. See ADR-0003.
- `category` is a plain validated string on `PromptTemplate`, not a separate `PromptCategory` table. See ADR-0003.
- Variable substitution (`{{token}}` → value) happens entirely client-side before calling the existing, unmodified `POST /content/generate`. See ADR-0004.
- No new architectural decisions were made in Phases 3–4 beyond applying ADR-0003/ADR-0004 as already recorded — `localStorage`-only persistence for last-selected/recent templates was already explicit Sprint 2 scope, not a new decision requiring its own ADR.

## Follow-ups for Future Sprints

Prompt Library (save/favorite/duplicate/search personal prompts), Version History, Rename, Restore, Soft Delete, Output Editor, Export (Markdown/plain text/DOCX/PDF), AI Gateway/multi-provider routing, background/async generation (tracked separately, see ADR-0005), streaming, image/video generation. A live-browser manual pass on the generation flow (see Validation above) is recommended before or during Sprint 3, even though it isn't blocking.
