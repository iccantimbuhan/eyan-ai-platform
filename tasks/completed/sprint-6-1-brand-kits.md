# Sprint 6.1 — Brand Kits

Status: Completed

## Goal

First phase of Sprint 6 ("Enterprise Creative Production Suite"): let every project own one or more Brand Kits (logos, colors, fonts, tone of voice, writing style, audience, approved terminology, restricted words, CTA style, and free-text brand/image/social guidelines) and let content and image generation optionally reference one. Brand Kits are first-class project assets — reviewable and versionable through the exact same `AssetReview`/`AssetVersion` tables Sprint 5 built, with zero changes to either table.

## Scope

### In Scope

- `BrandKit` model, owned by a `ContentProject` (one project → many kits).
- Full CRUD (`/api/v1/brand-kits`), scoped by project + requesting user's ownership of that project.
- `AssetType.BRAND_KIT` — Brand Kits appear in the existing Asset Library/Review Queue automatically (list, detail, review, duplicate, delete); regeneration is explicitly unsupported (a kit is user-authored, not provider-generated), matching how `PROMPT_TEMPLATE` already behaves.
- Optional `brandKitId` on `POST /content/generate` and `POST /images/generate`: when supplied, the kit's tone/terminology/restricted-words guidance is folded into the content system prompt, and its image style guidance is prepended to the image prompt. Omitted → today's behavior, byte-for-byte unchanged.
- New "Brand Kit" tab in the project workspace: list, create, edit, delete.

### Out of Scope (explicit, deferred)

- Real file upload for logos — no multipart/file-upload middleware exists anywhere in this codebase yet (`multer` or equivalent isn't a dependency), so logos are entered as a comma-separated list of URLs rather than uploaded files. Colors/fonts are likewise entered as comma-separated text (hex codes / font names) rather than a bespoke color-picker or tag-input UI. All four fields are still real, structured (`{url}[]` / `{hex}[]` / `string[]`) API fields — only the input UI is simplified for this phase.
- Enforcement/validation of restricted words against generated output — guidance is advisory (folded into the prompt), not a post-generation filter.
- A shared, cross-project Brand Kit library — kits are owned by one project, matching the explicit architectural correction made before implementation ("no second project hierarchy"; see Decisions Made).

## What Shipped

**Data model** — one new, purely additive table (`BrandKit`, owned by `ContentProject`), one new `AssetType` enum value (`BRAND_KIT`), and two new **nullable** `brandKitId` columns (`GeneratedContent`, `GeneratedImage`) — the same "new enum value + new mapper case + zero changes to existing consumers" recipe ADR-0008 documented for exactly this situation. `AssetReview`/`AssetVersion` needed no schema change at all.

**Backend** — a new vertical (`brand-kit.{routes,controller,service,repository,dto,mapper}.ts`) mirroring `saved-prompt.*` (the closest existing analog: an owned sub-resource of a project). `AssetService` gained a `BRAND_KIT` branch across `findSource`/`list`/`regenerate`/`duplicate`/`delete`/`providerOf`/`modelOf`/`toDetailDto` — the exact same shape as the three existing branches, no other method changed. `ContentService.generate()`/`ImageService.generate()` each gained one optional `brandKitId` parameter; when present, both look the kit up scoped to the requesting user *and* verify it belongs to the same project being generated into (a mismatch throws `NotFoundError`, same anti-enumeration posture as every other ownership check in this codebase), then fold its guidance into the prompt via a small shared `brand-kit-guidance.ts` helper.

**Frontend** — `features/content-studio/components/brand-kits/` (`BrandKitList`, `BrandKitCard`, `BrandKitFormDialog` + a colocated `brand-kit-schema.ts`), plus `api/brand-kits.api.ts` and four hooks (`use-brand-kits`, `use-create-brand-kit`, `use-update-brand-kit`, `use-delete-brand-kit`), following the exact `saved-prompts.*` pattern. `BrandKitFormDialog` uses react-hook-form + zod (modeled on `role-dialog.tsx`/`role-schema.ts`, the established pattern for multi-field forms) with comma-separated text inputs parsed into arrays only at submit time — avoids needing a field-array/tag-input component for what are otherwise plain array fields. `types/asset.ts` gained `BRAND_KIT` in `AssetType`/`ASSET_TYPE_OPTIONS`, and `supportsRegeneration()` now also excludes it (mirroring `PROMPT_TEMPLATE`).

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260726115523_add_brand_kits/`, `dto/brand-kit.dto.ts`, `dto/brand-kit.mapper.ts`, `dto/brand-kit-guidance.ts`, `repositories/brand-kit.repository.ts` (+test), `services/brand-kit.service.ts` (+test), `controllers/brand-kit.controller.ts`, `routes/v1/brand-kits.routes.ts`, `validators/brand-kit.validator.ts`.

**Backend — modified:** `prisma/schema.prisma`, `app.ts` (mount `/api/v1/brand-kits`), `dto/asset.mapper.ts` (+`mapBrandKitToSummary`/`mapBrandKitToDetail`), `services/asset.service.ts` (+`BRAND_KIT` branch, +test cases), `dto/content.dto.ts` / `dto/image.dto.ts` (+`brandKitId`), `repositories/content.repository.ts` / `repositories/image.repository.ts` (+`brandKitId` on `create()`), `services/content.service.ts` / `services/image.service.ts` (+brand-kit lookup and prompt folding, +test), `validators/content.validator.ts` / `validators/image.validator.ts` (+`brandKitId`).

**Frontend — new:** `types/brand-kit.ts`, `api/brand-kits.api.ts`, `hooks/use-brand-kits.ts`, `use-create-brand-kit.ts`, `use-update-brand-kit.ts`, `use-delete-brand-kit.ts`, `components/brand-kits/` (`BrandKitList`, `BrandKitCard`, `BrandKitFormDialog`, `brand-kit-schema.ts`, each with a `.test.tsx`/`.test.ts`).

**Frontend — modified:** `pages/project-workspace/ProjectWorkspace.tsx` (+"Brand Kit" tab), `types/asset.ts` (+`BRAND_KIT`), `components/assets/AssetCard.tsx` (+`Palette` icon for `BRAND_KIT`).

**Docs:** `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added.

## Database Changes

Migration `20260726115523_add_brand_kits`: `AssetType` gains `BRAND_KIT` (additive enum value); new `BrandKit` table (owned by `ContentProject` via `projectId`, cascade delete; `createdBy` FK to `User`); new nullable `brandKitId` columns on `GeneratedContent`/`GeneratedImage` (`SetNull` on delete — deleting a kit never deletes content generated while it was referenced). Fully additive — no existing column altered or dropped, no backfill needed.

## API Changes

New, under `/api/v1/brand-kits` (all `authenticate`-gated, scoped by project ownership):
- `GET /?projectId=` — list a project's brand kits.
- `GET /:id` — detail.
- `POST /` — create (`projectId` required in body).
- `PATCH /:id` — update.
- `DELETE /:id` — delete.

Existing endpoints: `POST /content/generate` and `POST /images/generate` both gained an optional `brandKitId` body field — omitted means today's unchanged behavior. `GET /api/v1/assets` and its sibling endpoints (`review`, `regenerate`, `duplicate`, `delete`, `versions`, `batch`) now also accept `BRAND_KIT` as an `assetType`; `regenerate` returns `400 AssetActionNotSupportedError` for it, matching `PROMPT_TEMPLATE`.

## Validation

- Build: clean (backend `tsc`; frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step (matches existing convention); frontend `eslint` clean on every file this phase touched or added.
- Tests: backend 320/320 passing (24 new — `brand-kit.service.test.ts` 9, `brand-kit.repository.test.ts` 5, `asset.service.test.ts` +5 `BRAND_KIT`-branch cases, `content.service.test.ts` +3 brand-guidance cases, `image.service.test.ts` +3 brand-guidance cases — precisely against the pre-Sprint-6.1 baseline of 296). Re-confirmed on 2026-07-27 against the real development database and backend, still 320/320. Frontend: 262 tests across the full 43-file browser-mode suite (9 new to this phase, in `BrandKitList.test.tsx`, `BrandKitFormDialog.test.tsx`, `brand-kit-schema.test.ts`, plus `AssetCard.test.tsx`'s new `BRAND_KIT` icon branch) — 258 passing, 4 failing, all 4 the same long-standing, already-documented `search-provider.test.tsx` (2) / `user-auth-form.test.tsx` (2) baseline failures, none in any file this phase touched. The full-suite run-to-completion blocker noted when this phase was first written (a 64MB `/dev/shm` container constraint) was specific to that sandbox, not this codebase — running locally against a normal-sized `/dev/shm` (5.9G), the full suite now completes cleanly in ~77s with no crash.
- Live validation (2026-07-27, against the real EYAN Studio development database and backend, superseding the "not performed this phase" note this section originally carried): `prisma migrate status` confirmed the hand-authored `20260726115523_add_brand_kits` migration was the one pending migration on the shared dev database (12 prior migrations already applied); `prisma migrate deploy` applied it with **no modification needed** — the hand-authored SQL was correct as written; `prisma migrate diff` between the live database and `schema.prisma` afterward reported **no difference detected**, confirming full schema/database sync. `prisma generate` regenerated the client cleanly. With the backend running against this database, exercised live end-to-end: Brand Kit CRUD (create with structured `primaryColors`/`approvedTerminology`/`restrictedWords`, list, get, update); content generation with `brandKitId` produced output that visibly reflected the kit's tone, approved terminology ("launch vehicle"), CTA style ("Launch Now!"), and brand guideline ("safety-certified"), while omitting `brandKitId` remained byte-for-byte the pre-Sprint-6.1 behavior; image generation with `brandKitId` completed successfully end-to-end (real Hugging Face provider call — Gemini hit an unrelated, external free-tier quota limit first, confirming the request path itself was fine); an invalid/cross-project `brandKitId` correctly 404s on both generation endpoints; the Brand Kit appeared correctly in `GET /api/v1/assets` as `assetType: "BRAND_KIT"` alongside the content/image assets from the same project; `AssetReview` (single review, matching behavior on both a pre-existing `BLOG` asset and the new `BRAND_KIT` asset), `AssetVersion` (`GET .../versions`), duplicate, and the `regenerate` 400/unsupported path all worked identically to their pre-Sprint-6.1 behavior on existing types and correctly extended to `BRAND_KIT`; a QA batch-approve action on an existing content asset also worked unchanged. All test data created during validation was deleted via a single project cascade-delete afterward, leaving the dev database as it was found. See `PROJECT_STATE.md` for the session summary.

## Decisions Made

- **No second project hierarchy.** The initial plan proposed a `VideoProject` header entity for the (later) Video Studio phase; before any code was written, the plan was revised so `VideoAsset` (Sprint 6.2) will hang directly off `ContentProject`, exactly like Brand Kits do — reaffirming this repo's single-hierarchy rule ("a Content Project is the complete creative workspace") rather than letting Sprint 6 introduce a competing grouping concept.
- **One project → many Brand Kits, not a shared cross-project library.** Matches the explicit requirement ("Each project can own one or more Brand Kits... Brand Kits become first-class project assets") over the alternative (a `SavedPrompt`-style reusable-across-projects model) — an agency managing several distinct clients' campaigns in separate projects wants each project's kit(s) scoped to that project, not accidentally selectable from an unrelated one.
- **Logos/colors/fonts as comma-separated text, not file upload / color-picker / tag-input.** No upload middleware exists anywhere in this codebase; adding one (e.g. `multer`) for a single field in one form was judged out of proportion to this phase, versus reusing the same simple pattern already used for `approvedTerminology`/`restrictedWords`. The underlying API/schema fields are still fully structured — this is a UI simplification, not a schema compromise, and is captured as a named follow-up rather than silently scoped down.
- **Brand Kit guidance is advisory, not enforced.** Restricted words are asked to be avoided (folded into the prompt as an instruction) rather than scanned for and blocked post-generation — consistent with this codebase having no content-moderation/enforcement layer anywhere else either; enforcement would be new architecture, not an extension of existing patterns.
- **Placed under `features/content-studio/`, not a new top-level `features/brand-kits/`** — matches how Assets/Review (Sprint 5) are organized despite being a conceptually distinct capability, since Brand Kits are tightly scoped to one project's workspace exactly like those are, not a standalone route/page.

## Follow-ups for Future Sprints

- ~~Verify the hand-authored migration against a real PostgreSQL instance and perform the live end-to-end validation this phase skipped~~ — done 2026-07-27; see the Validation section above.
- Real logo upload once a file-upload primitive exists in the backend (would reuse `StorageProvider`, the same abstraction Image Studio already uses for provider-generated bytes).
- A proper color-picker / tag-input UI for colors, fonts, and terminology, replacing the comma-separated-text placeholder.
- Sprint 6.2 (AI Video Studio) — per the revised, flattened plan: `VideoAsset` rows hang directly off `ContentProject` (no `VideoProject` header table), grouped by a plain `videoGroupId` column rather than a second entity.
- ~~Investigate a `--disable-dev-shm-usage` (or equivalent) Playwright launch flag for this sandbox's 64MB `/dev/shm`~~ — moot on the current local development environment (5.9G `/dev/shm`, full suite completes cleanly); still worth carrying forward as a defensive flag if this project is ever run again in a small-`/dev/shm` container.
