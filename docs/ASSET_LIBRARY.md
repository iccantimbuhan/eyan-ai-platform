# Asset Library & QA Workflow

Sprint 5 adds a management layer on top of Content Studio's existing generation features: an **Asset Library** (browse, search, filter, and batch-act on everything generated in a project) and a **QA review workflow** (Draft → Needs Review → Approved/Rejected → Published, with a checklist, reviewer notes, and a per-project Review Queue). Generation still happens exactly where it always did — the Content and Images tabs are unchanged. Management happens in two new tabs: **Assets** and **Review**.

This document covers the architecture and how to extend it. For the feature list itself, see the sprint log (`tasks/completed/sprint-5-asset-library-qa.md`).

---

## The core design problem

Before this sprint, generated output lived in two independent tables — `GeneratedContent` and `GeneratedImage` — each with its own repository/service/controller, and no shared concept of "an asset." Adding review status, a checklist, and version history for both (and for a third source, project-scoped prompt templates) without redesigning either existing table was the central constraint. See ADR-0008 for the full decision record; this section summarizes the shape.

**`AssetType`** is a new enum whose first five values mirror `ContentType` exactly (`BLOG`, `EMAIL`, `SOCIAL_MEDIA`, `MARKETING_COPY`, `DOCUMENTATION`), plus `IMAGE` and `PROMPT_TEMPLATE` — the two other real asset sources. A `GeneratedContent.type` value casts straight to `AssetType`; no mapping table exists or is needed.

**`AssetReview`** and **`AssetVersion`** are two new, purely additive tables — neither `GeneratedContent` nor `GeneratedImage` gained a new column for either concern. Both are keyed on `(assetType, sourceId)`, where `sourceId` is the id of the underlying `GeneratedContent` / `GeneratedImage` / `SavedPrompt` row. An asset with no `AssetReview` row is implicitly `status: DRAFT`; an asset with no `AssetVersion` row is implicitly `version: 1`. Both rows are created lazily — the first time an asset is actually reviewed or regenerated — never eagerly at generation time.

**`SavedPrompt.projectId`** (nullable) is the one existing table that did change. `null` means a global, reusable prompt — the original behavior, still exactly what the standalone Prompt Library page shows via `GET /saved-prompts`. A non-null value scopes the prompt to a project, making it a real `PROMPT_TEMPLATE` asset in that project's Asset Library. There is no dedicated creation UI beyond the Asset Library's "New Prompt Template" button (which reuses `SavePromptDialog` with a `projectId` prop) — there is no automatic migration of existing global prompts into any project.

**`generationTimeMs`** (nullable) was added directly to `GeneratedContent` and `GeneratedImage` — the one exception to "no columns on the existing tables." Asset Details requires showing how long a generation took, and that value cannot be reconstructed after the fact; it's captured by timing the existing `provider.generate()` / `chatService.chat()` call in `ContentService.generate()` / `ImageService.generate()`. No control flow or error handling in either method changed.

## Aggregation: how `GET /assets` actually works

`AssetService.list()` does **not** run one query. It fetches up to 500 rows from each relevant source in parallel (`ContentRepository.findMany`, `ImageRepository.findMany`, `SavedPromptRepository.findManyByProject` — skipping a source entirely if the `type` filter excludes it), maps each row to a common `AssetSummaryDto` via `asset.mapper.ts`, batch-fetches review/version rows for all of them in two more queries (`assetReviewRepository.findManyBySourceIds` / `assetVersionRepository.findManyBySourceIds`), merges the results, then applies `search`/`status`/`provider`/`model` filters, sorts, and paginates **in application code**.

This is a deliberate, documented scope boundary: fine at demo/portfolio data volumes (dozens to hundreds of assets per project), not intended to scale to a real production catalog without moving to a database-level `UNION ALL` (or a materialized view). If that becomes necessary, `AssetService.list()` is the only place that needs to change — the DTO shape, the controller, and every frontend consumer are unaffected.

## Adding a future asset type

The brief explicitly calls for this to be possible "without refactoring." The recipe, using `VIDEO` as the example (not implemented — no video generation provider exists yet):

1. Add `VIDEO` to the `AssetType` enum in `schema.prisma`; run a migration.
2. Add a `mapVideoToSummary()` / `mapVideoToDetail()` pair in `asset.mapper.ts`, following the existing three pairs' shape.
3. Add the new source's repository to `AssetService`'s constructor, and one more branch in `list()`'s parallel fetch, `findSource()`'s dispatch, and `toDetailDto()`'s switch.
4. Add `'videos'` items to `CHECKLIST_ITEMS` on the frontend (`types/asset.ts`) — already present, reserved, and unreachable until step 1–3 land, per the brief's own "future-ready" framing for video this sprint.

No existing model, endpoint, or frontend component needs to change shape — only new cases are added to a small number of switches.

## What's client-side only, and why

**Downloads and exports never hit a new backend endpoint.** Images already have a real, downloadable file via the existing static serving (`resolveImageUrl()` + a `fetch()`-then-blob download, forcing the download even across origins in local dev); Markdown/JSON exports are built in the browser from data the app already fetched (`lib/asset-export.ts`). This was an explicit scope decision (see the requirements discussion): no archiver dependency, no streaming multi-file endpoint, nothing that isn't already fetchable.

**Duplicate behaves differently per asset type, and that's deliberate, not inconsistent:**
- Content: a direct database row copy (`ContentRepository.create()` with the same prompt/output/model) — instant, free, no provider call.
- Prompt template: a direct row copy (`SavedPromptRepository.create()`), name suffixed `" (Copy)"`.
- Image: **not** a file copy — there's no copy primitive on `StorageProvider`, and two `GeneratedImage` rows pointing at one stored file would make deleting either one corrupt the other. An image "Duplicate" re-generates a fresh copy from the same prompt/provider instead. It deliberately does not create a version link (a duplicate is an independent asset, not a new version of the one it was copied from) — that's what actually distinguishes it from Regenerate.

**Version Compare is side-by-side, not a line-level diff.** The brief asks for "Compare," not a diff algorithm; each pane renders the full output/image for the selected version via the same `AssetDetail` shape the detail sheet already uses. **Version Restore is present but disabled** — explicitly future-ready per the brief, not wired this sprint.

**QA Score is a plain number field, not a computed one.** A reviewer can enter 0–100 manually via the QA panel; nothing calculates or validates it against the checklist. "Future-ready" per the brief means the field exists and is capturable, not that scoring is automated.

## Review Queue scope

The Review Queue is a tab inside `ProjectWorkspace`, not a global route — a deliberate choice from the requirements discussion, matching how a QA workflow was asked to ship this sprint. It is built on the exact same `useAssets(projectId, filters)` hook and `AssetSummary` data as the Asset Library tab; only the `status` filter and row density differ. The backend's `GET /assets` endpoint and `AssetService.list()` already accept `projectId` as a normal query parameter (not hardcoded into the route path), so promoting this to a global, cross-project queue later is a matter of relaxing `listAssetsValidator`'s `projectId` requirement and adding a new route — not a rewrite of the aggregation, review, or versioning logic.

## Frontend: why the data-table kit wasn't reused directly

`components/data-table/{toolbar,faceted-filter,pagination,bulk-actions}.tsx` already exist and are visually exactly what an "enterprise" search/filter/paginate/batch-select UI should look like — but every one of them is bound to a `@tanstack/react-table` `Table`/`Column` instance driving **client-side** filtering and pagination over already-loaded rows. The Asset Library filters and paginates **server-side** (`GET /assets?type=&status=&provider=&search=&page=`, each filter single-valued). Forcing that through `react-table`'s client-filtering abstraction would mean either lying to it (`manualFiltering: true` on a table whose whole API assumes it isn't manual) or maintaining a parallel, redundant source of truth.

Instead, `AssetToolbar`, `AssetPagination`, and `AssetBulkActionsBar` are purpose-built siblings — same visual language (same Tailwind classes, same Popover/Command/Badge composition, same floating bottom-center bulk-action bar), driven by plain props instead of a table instance. This is not a new architectural pattern; it's the same UI composition already established, adapted to the data flow this feature actually has.

## Files

Backend: `prisma/schema.prisma` (new enums/models), `dto/asset.dto.ts`, `dto/asset.mapper.ts`, `repositories/asset-review.repository.ts`, `repositories/asset-version.repository.ts`, `services/asset.service.ts`, `controllers/asset.controller.ts`, `routes/v1/asset.routes.ts`, `validators/asset.validator.ts`, `errors/asset.error.ts`.

Frontend: `types/asset.ts`, `api/assets.api.ts`, `hooks/use-assets.ts` and seven sibling hooks, `lib/asset-export.ts`, `components/assets/*` (`AssetLibrary`, `AssetCard`, `AssetDetailSheet`, `AssetStatusBadge`, `AssetToolbar`, `AssetPagination`, `AssetBulkActionsBar`, `QaChecklist`, `VersionHistory`, `VersionCompareDialog`, `NewPromptTemplateDialog`, `ReviewQueue`).
