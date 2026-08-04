# Sprint 5 — Enterprise Asset Library & QA Workflow

Status: Completed

## Goal

Build a management layer over what Content Studio already generates: an Asset Library (search, filter, batch-act across every generated content item, image, and prompt template in a project) and a QA review workflow (Draft → Needs Review → Approved/Rejected → Published, with a checklist, reviewer notes, and a per-project Review Queue) — positioned explicitly to demonstrate AI Content Production / Creative Operations / Content QA workflows for the portfolio's target roles. Generation itself (Content and Images tabs) was not to be redesigned, only extended.

## Scope

### In Scope

- Unified Asset Library aggregating `GeneratedContent`, `GeneratedImage`, and (newly) project-scoped `SavedPrompt` rows, with search (title/prompt/provider/model/project), filters (type/status/provider/model), and server-side pagination.
- Asset Card (thumbnail, title, type, status, provider, model, created date, version, project, prompt preview) with quick actions (View, Copy, Download, Duplicate, Regenerate, Delete).
- Asset Detail slide-over (General/Metadata/QA/Version History/Actions sections).
- QA review lifecycle with a reusable Pass/Fail/Comment checklist (separate content vs. image item sets), reviewer notes, and a manually-entered QA score.
- Per-project Review Queue tab, filterable by status, with inline Approve/Reject/Add Notes/Open.
- Batch actions (Approve, Reject, Delete, Download, Export) over a multi-selected set of asset cards.
- Version history on regeneration (linked lineage), with a side-by-side Compare dialog.
- Client-side Markdown/JSON export and downloads.
- Project-scoping for `SavedPrompt`, so prompt templates can be real, reviewable project assets.

### Out of Scope (explicit, agreed before implementation — see requirements discussion and `docs/ASSET_LIBRARY.md`)

- A global, cross-project Review Queue route (this sprint: a per-project tab; the backend/hook already support projectId being optional, so this is additive later, not a rewrite).
- Real video generation/assets (enum and checklist taxonomy are reserved and ready; no table, no UI, no fake data).
- Server-side export endpoints (ZIP, PDF, bulk archive) — everything ships client-side from already-fetched data.
- Version Restore (button present, visibly disabled).
- Automated/computed QA scoring (manual number entry only).
- Tags (search/filter) — not part of this sprint's checklist/taxonomy.

## What Shipped

**Data model** — two new, purely additive tables (`AssetReview`, `AssetVersion`), both keyed on `(assetType, sourceId)`; `GeneratedContent`/`GeneratedImage` gained zero columns for review or versioning. `SavedPrompt.projectId` (nullable) lets a prompt be scoped to a project without touching the standalone Prompt Library's existing global-prompt behavior. `generationTimeMs` (nullable, additive) was added to `GeneratedContent`/`GeneratedImage` — the one necessary touch to already-generating code, since Asset Details needs to show generation time and it can't be reconstructed after the fact. Full rationale: ADR-0008.

**Backend** — `AssetService` (new) composes the existing `ContentRepository`/`ImageRepository`/`SavedPromptRepository`/`ContentService`/`ImageService` rather than reimplementing generation or ownership checks; `list()` merges up to 500 rows per source in application code (documented scale boundary); `regenerate()`/`duplicate()`/`delete()` all delegate the actual generation/deletion to the existing services, only adding version-linking or review-cleanup on top. 8 new REST endpoints under `/api/v1/assets`, following this codebase's existing Route → Validation → Auth → Controller → Service → Repository pipeline exactly.

**Frontend** — two new tabs in `ProjectWorkspace` (Assets, Review), 8 new hooks (all thin `useQuery`/`useMutation` wrappers matching the established pattern), 12 new components under `components/assets/`. Filter/pagination/batch-select UI is visually modeled on the existing `components/data-table/*` kit but built as purpose-built, plain-props siblings rather than a direct reuse, since that kit assumes client-side filtering over already-loaded rows and this feature filters server-side (documented in `docs/ASSET_LIBRARY.md`).

**Prompt template project-scoping** — `SavePromptDialog` (existing component) gained an optional `projectId` prop, threaded through to the existing `useCreateSavedPrompt` mutation; `NewPromptTemplateDialog` is a thin, un-duplicated wrapper used by the Asset Library's "New Prompt Template" action.

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260724212434_add_asset_library_and_qa/`, `dto/asset.dto.ts`, `dto/asset.mapper.ts`, `repositories/asset-review.repository.ts` (+test), `repositories/asset-version.repository.ts` (+test), `services/asset.service.ts` (+test), `controllers/asset.controller.ts`, `routes/v1/asset.routes.ts`, `validators/asset.validator.ts`, `errors/asset.error.ts`.

**Backend — modified:** `prisma/schema.prisma`, `app.ts` (mount `/api/v1/assets`), `dto/content.dto.ts` / `dto/image.dto.ts` (+`generationTimeMs`), `dto/saved-prompt.dto.ts` (+`projectId`), `repositories/content.repository.ts` / `.test.ts`, `repositories/image.repository.ts` / `.test.ts`, `repositories/saved-prompt.repository.ts` / `.test.ts`, `services/content.service.ts` / `.test.ts`, `services/image.service.ts` / `.test.ts`, `services/saved-prompt.service.test.ts`, `validators/saved-prompt.validator.ts`.

**Frontend — new:** `types/asset.ts`, `api/assets.api.ts`, `lib/asset-export.ts`, `hooks/use-assets.ts`, `use-asset.ts`, `use-asset-versions.ts`, `use-review-asset.ts`, `use-regenerate-asset.ts`, `use-duplicate-asset.ts`, `use-delete-asset.ts`, `use-batch-asset-action.ts`, `components/assets/` (`AssetLibrary`, `AssetCard`, `AssetStatusBadge`, `AssetToolbar`, `AssetPagination`, `AssetBulkActionsBar`, `AssetDetailSheet`, `QaChecklist`, `VersionHistory`, `VersionCompareDialog`, `NewPromptTemplateDialog`, `ReviewQueue`, each with a `.test.tsx`).

**Frontend — modified:** `pages/project-workspace/ProjectWorkspace.tsx` (+Assets/Review tabs), `types/saved-prompt.ts` (+`projectId`), `components/prompt-library/SavePromptDialog.tsx` (+optional `projectId` prop) and its test, three other pre-existing test fixtures updated for the now-required `SavedPrompt.projectId` field (`GenerateForm.test.tsx`, `SavedPromptCard.test.tsx`, `SavedPromptList.test.tsx`).

**Docs:** `docs/ASSET_LIBRARY.md` (new), `docs/architecture/decisions/ADR-0008-asset-library-polymorphic-review-versioning.md` (new), `docs/ARCHITECTURE.md`, `README.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated.

## Database Changes

Migration `20260724212434_add_asset_library_and_qa`: new enums `AssetType`, `ReviewStatus`; new tables `AssetReview`, `AssetVersion`; new nullable columns `SavedPrompt.projectId`, `GeneratedContent.generationTimeMs`, `GeneratedImage.generationTimeMs`. Fully additive — no existing column altered or dropped, no data migration/backfill needed (all new columns nullable, all new tables empty until first use).

## API Changes

New, under `/api/v1/assets` (all `authenticate`-gated):
- `GET /` — list/search/filter/paginate (`projectId` required this sprint).
- `GET /:assetType/:sourceId` — detail.
- `PATCH /:assetType/:sourceId/review` — upsert QA review.
- `POST /:assetType/:sourceId/regenerate` — regenerate + link version.
- `POST /:assetType/:sourceId/duplicate` — duplicate, no version link.
- `DELETE /:assetType/:sourceId` — delete.
- `GET /:assetType/:sourceId/versions` — version history.
- `POST /batch` — batch approve/reject/delete.

Existing endpoints: `POST /saved-prompts` gained an optional `projectId` body field (backward compatible — omitted means the existing global-prompt behavior, unchanged). No other existing endpoint's request or response shape changed except the additive `generationTimeMs` field now present in `GET /content`/`GET /images` responses.

## Validation

- Build: clean (backend `tsc`, frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step (matches existing convention); frontend repo-wide lint unchanged from its pre-existing baseline (26 errors / 3 warnings, none in any Sprint 5 file).
- Tests: backend 296/296 passing (55 new, verified precisely via `git stash` against the pre-Sprint-5 baseline of 241 — `asset.service.test.ts` is the primary new surface, 35 tests, DI-faking every constructor dependency in the established `image.service.test.ts` style; plus `asset-review.repository.test.ts`, `asset-version.repository.test.ts`, and small additive assertions in `content`/`image`/`saved-prompt` repository and service tests). Frontend: 253 tests total, 46 new (all passing, verified the same way against a pre-Sprint-5 baseline of 207), the remaining 4 failures are the long-standing, pre-existing, unrelated baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2).
- Live validation: extensive, against a throwaway backend on a spare port (production, port 3001, health-checked before/after, never touched). Registered a disposable user, created a project, generated a real image via the free `fake` provider and real content via Ollama (cold-start ~123s, confirming `generationTimeMs` capture), created a project-scoped prompt template. Exercised: unified list aggregation (all 3 asset types, correctly merged and ordered), type filter, full-text search, a review update (status/notes/qaScore/checklist all persisted and returned correctly with reviewer name), a full regenerate-then-verify sequence (new image correctly linked as version 2, original image's independent `APPROVED` status preserved), an instant content duplicate (0.084s, confirmed no provider call, no version link), a rejected regenerate-on-prompt-template (correct 400 with a safe message), a batch action with a deliberately-invalid item (2 succeeded, 1 failed with a clear per-item error, batch did not abort), delete, and the assetType validator correctly rejecting an invalid type. Regression-checked `GET /content`, `GET /images`, `GET /saved-prompts` all still work correctly with existing data untouched.

## Decisions Made

- **ADR-0008** — two additive polymorphic tables (`AssetReview`, `AssetVersion`) keyed on `(assetType, sourceId)`, not a unified `Asset` table, not new columns on `GeneratedContent`/`GeneratedImage`. See the ADR for full alternatives-considered reasoning.
- Aggregation is in-memory (application-code merge/filter/paginate across parallel per-source queries), not a database-level `UNION ALL` — explicit, documented scale boundary appropriate at portfolio data volumes.
- Review Queue is a per-project tab this sprint, not a global route, but built so promoting it later needs no rewrite (confirmed via the requirements discussion).
- Prompt Template asset support is real (backed by `SavedPrompt.projectId`), not a placeholder; Video asset support is a documented no-op this sprint (no table, no fake data, no reachable UI) — an explicit, asymmetric decision made during the requirements discussion, not an oversight.
- Downloads/exports are entirely client-side; no new backend export surface was added.
- Image "Duplicate" regenerates rather than copies the file, to avoid two DB rows sharing one deletable file — asymmetric with content/prompt-template duplication (a true row copy) for a reason, documented in `docs/ASSET_LIBRARY.md`.
- The existing `components/data-table/*` kit was not wrapped directly (it's bound to `@tanstack/react-table`'s client-side filtering); purpose-built, visually-matching plain-props siblings were used instead — a deliberate deviation from the original plan's literal wording, made and documented once the kit's actual coupling became clear during implementation.

## Follow-ups for Future Sprints

- Deploy Sprint 4.1 through Sprint 5 to production (nothing since Sprint 3.5 has been deployed); add the still-open nginx `/uploads/` proxy block at the same time.
- Promote the Review Queue to a global, cross-project route when there's a real need — the `useAssets`/`GET /assets` groundwork already supports an optional `projectId`.
- Real video generation + `VIDEO` as a live asset type, when a video provider exists — the enum/mapper/checklist extension points are ready (see `docs/ASSET_LIBRARY.md`).
- Version Restore, once there's a concrete need to roll an asset back rather than just compare and regenerate.
- If Asset Library usage ever approaches real production data volumes, move `AssetService.list()`'s in-memory merge to a database-level `UNION ALL` or materialized view.
