# Sprint 6.2 — AI Video Studio

Status: Completed

## Goal

Second phase of Sprint 6 ("Enterprise Creative Production Suite"): let every project generate and manage video-production artifacts — Script, Scene Breakdown, Shot List, Voice-over Script, Captions, Subtitles, Storyboard, and Thumbnail — grouped into "one video" without a second project-level entity, fully integrated into the existing polymorphic Asset Library (ADR-0008) exactly like Brand Kits (Sprint 6.1) were.

## Scope

### In Scope

- `VideoAsset` model, owned directly by a `ContentProject` (no `VideoProject` header entity — reaffirms this repo's single-project-hierarchy rule, a correction already made before Sprint 6.1 was implemented).
- `VideoAssetKind` enum distinguishing eight artifact kinds: six text kinds (`SCRIPT`, `SCENE_BREAKDOWN`, `SHOT_LIST`, `VOICE_OVER_SCRIPT`, `CAPTIONS`, `SUBTITLES`) and two image kinds (`STORYBOARD`, `THUMBNAIL`).
- `POST /api/v1/video-assets/generate`, `GET /video-assets`, `GET /video-assets/:id`, `DELETE /video-assets/:id` — full generate/list/detail/delete, scoped by project ownership.
- A plain `videoGroupId` column groups artifacts belonging to one video; omitted on the first call, a fresh one is generated server-side (`crypto.randomUUID()`), and later calls can attach to it explicitly.
- Optional `brandKitId`, same guidance-only, never-enforced posture as content/image generation.
- `AssetType.VIDEO` — video assets appear in the existing Asset Library/Review Queue automatically (list, detail, review, duplicate, delete); **regeneration is supported** (unlike `BRAND_KIT`/`PROMPT_TEMPLATE`), since a video asset — both kind categories — is provider/AI-generated.
- New "Video" tab in the project workspace: an artifact-type selector (grouped Text/Visual), a brand-kit picker, an "attach to existing video" picker, and a grouped, kind-badged output view.

### Out of Scope (explicit, deferred)

- A `VideoScriptProvider` registry mirroring `ImageProviderFactory` for the six text kinds. Investigated and deliberately not built — see Decisions Made.
- Real timestamp/timing sync for `SUBTITLES`/`CAPTIONS` — no actual video file exists yet to sync against; both produce plain sequential text.
- A `GET /video-assets/groups` aggregation endpoint — the "attach to existing video" picker derives distinct `videoGroupId`s client-side from the already-fetched per-project list, matching Asset Library's own documented in-memory-aggregation scale boundary.
- Retrofitting a brand-kit picker onto the existing Content/Image generation forms — see Decisions Made / Follow-ups.

## What Shipped

**Data model** — one new, purely additive table (`VideoAsset`, owned by `ContentProject`, optional `BrandKit` reference), one new `VideoAssetKind` enum, one new `AssetType` enum value (`VIDEO`) — the same "new enum value + new mapper case + zero changes to existing consumers" recipe ADR-0008 documented and Sprint 6.1 already executed once for Brand Kits. `AssetReview`/`AssetVersion` needed no schema change at all. One table covers both artifact shapes: text-kind rows populate `output`/`model` (mirroring `GeneratedContent`); image-kind rows populate `provider`/`width`/`height`/`format`/`storagePath`/`status`/`errorMessage` (mirroring `GeneratedImage` exactly, including its full `PENDING → COMPLETED/FAILED` lifecycle — text-kind rows, like `GeneratedContent`, are only ever persisted after a successful generation, so they're always written as `COMPLETED`).

**Backend** — a new vertical (`video-asset.{dto,mapper,repository,service,controller}.ts`, `routes/v1/video-assets.routes.ts`, `validators/video-asset.validator.ts`) mirroring the Brand Kit vertical's file-for-file shape. `VideoAssetService.generate()` is the orchestration layer: it resolves/creates the `videoGroupId`, then branches on `isTextVideoKind(kind)` (from the new `config/video-prompts.ts`, mirroring `content-prompts.ts`'s `CONTENT_SYSTEM_PROMPTS` shape) — the text path calls `ChatService`/`OllamaProvider` directly, stage-for-stage identical to `ContentService.generate()`; the image path resolves a provider via `ImageProviderFactory` and orchestrates provider → storage → status update, stage-for-stage identical to `ImageService.generate()`, including never leaking a raw provider error to the client. Both paths reuse `buildContentBrandGuidance()`/`buildImageBrandGuidance()` (Sprint 6.1's `brand-kit-guidance.ts`) completely unchanged. `AssetService` gained a `VIDEO` branch across `findSource`/`list`/`regenerate`/`duplicate`/`delete`/`providerOf`/`modelOf`/`toDetailDto` — the same shape as every existing branch, with two real behavioral differences from Brand Kits: regeneration is supported (reuses the stored `prompt`/`kind`/`videoGroupId`/`brandKitId`, plus `provider`/`width`/`height` for image kinds), and duplicate dispatches to whichever of the two existing duplicate strategies (direct row copy vs. re-generate) applies to the source row's `kind`.

**Frontend** — `components/video-studio/` (`VideoGenerateForm`, `VideoAssetList`) plus `api/video-assets.api.ts` and three hooks (`use-video-assets` — exporting a centralized `videoAssetsQueryKey()` builder, the Brand Kit pattern rather than the Images tab's less consistent inlined-key one — `use-generate-video-asset`, `use-delete-video-asset`). `VideoGenerateForm` mirrors `ImageGenerateForm`'s prop shape (takes the mutation hook instance as a prop) plus a kind selector (grouped Text/Visual `<SelectGroup>`s), a new reusable `BrandKitSelect` component, and a "start a new video / attach to an existing one" picker derived client-side from the already-fetched list. `VideoAssetList` groups the project's video assets by `videoGroupId` (most-recently-updated group first), rendering each artifact as a kind-badged card — text-kind cards show an output excerpt, image-kind cards show the image via the same `resolveImageUrl()` Images already uses. `types/asset.ts` gained `VIDEO` in `AssetType`/`ASSET_TYPE_OPTIONS`, routed `checklistCategoryForAssetType('VIDEO')` to the already-existing-but-previously-unreachable `'videos'` checklist category, and `supportsRegeneration('VIDEO')` returns `true`. `AssetCard.tsx` gained a `Video` icon branch.

## Files Created / Modified

**Backend — new:** `prisma/migrations/20260727090212_add_video_assets/`, `config/video-prompts.ts`, `dto/video-asset.dto.ts`, `dto/video-asset.mapper.ts`, `repositories/video-asset.repository.ts` (+test), `services/video-asset.service.ts` (+test), `controllers/video-asset.controller.ts`, `routes/v1/video-assets.routes.ts`, `validators/video-asset.validator.ts`.

**Backend — modified:** `prisma/schema.prisma`, `app.ts` (mount `/api/v1/video-assets`), `dto/asset.mapper.ts` (+`mapVideoAssetToSummary`/`mapVideoAssetToDetail`), `services/asset.service.ts` (+`VIDEO`/`video` branch, +test cases).

**Frontend — new:** `types/video-asset.ts`, `api/video-assets.api.ts`, `hooks/use-video-assets.ts`, `use-generate-video-asset.ts`, `use-delete-video-asset.ts`, `components/video-studio/` (`VideoGenerateForm`, `VideoAssetList`, each with a `.test.tsx`), `components/brand-kits/BrandKitSelect.tsx` (+test).

**Frontend — modified:** `pages/project-workspace/ProjectWorkspace.tsx` (+"Video" tab), `types/asset.ts` (+`VIDEO`), `components/assets/AssetCard.tsx` (+`Video` icon).

**Docs:** `docs/ASSET_LIBRARY.md`, `CHANGELOG.md`, `PROJECT_STATE.md` updated; this sprint log added.

## Database Changes

Migration `20260727090212_add_video_assets` (Prisma-generated via `prisma migrate dev` against the real development database, not hand-authored): `AssetType` gains `VIDEO` (additive enum value); new `VideoAssetKind` enum; new `VideoAsset` table (owned by `ContentProject` via `projectId`, cascade delete; optional `BrandKit` reference, `SetNull` on delete). Fully additive — no existing column altered or dropped, no backfill needed.

## API Changes

New, under `/api/v1/video-assets` (all `authenticate`-gated, scoped by project ownership):
- `POST /generate` — body: `projectId`, `kind`, `prompt`, optional `videoGroupId`/`brandKitId`/`provider`/`width`/`height` (the last three apply only to image kinds, silently ignored for text kinds).
- `GET /?projectId=&videoGroupId=&kind=` — list.
- `GET /:id` — detail.
- `DELETE /:id` — delete.

Existing endpoints: `GET /api/v1/assets` and its sibling endpoints (`review`, `regenerate`, `duplicate`, `delete`, `versions`, `batch`) now also accept `VIDEO` as an `assetType`; unlike `BRAND_KIT`/`PROMPT_TEMPLATE`, `regenerate` is fully supported for it.

## Validation

- Build: clean (backend `tsc`; frontend `tsc -b && vite build`).
- Typecheck: clean on both sides.
- Lint: backend has no lint step (matches existing convention); frontend `eslint` clean on every file this phase touched or added — repo-wide lint unchanged from baseline (26 errors/3 warnings).
- Tests: backend 347/347 passing (27 new — `video-asset.repository.test.ts` 8, `video-asset.service.test.ts` 15, `asset.service.test.ts` +4 `VIDEO`-branch cases — against the pre-Sprint-6.2 baseline of 320). Frontend: full 46-file/280-test suite runs to completion — 276 passing, 4 failing, all 4 the same pre-existing `search-provider.test.tsx`/`user-auth-form.test.tsx` baseline failures, none in a file this phase touched (18 new tests across `VideoGenerateForm.test.tsx`, `VideoAssetList.test.tsx`, `BrandKitSelect.test.tsx`, all passing; `AssetCard.test.tsx` re-verified passing unchanged).
- Live validation (2026-07-27, against the real EYAN Studio development database and backend, on a throwaway project + throwaway user, cascade-deleted afterward): generated one real artifact of all 8 `VideoAssetKind` values — the 6 text kinds via live Ollama calls (`SCRIPT` folded brand-kit guidance visibly into its output — "Rocket Co", "launch vehicle" — while the other 5, generated without a brand kit, stayed on-topic and unbranded), the 2 image kinds via a live Hugging Face provider call (real PNG bytes persisted, `COMPLETED` status). Confirmed: omitting `videoGroupId` on the first call generates a fresh group and every subsequent call with that `videoGroupId` attaches to it correctly (verified via the `videoGroupId` list filter); the Asset Library shows every row as `assetType: "VIDEO"` with the correct kind-prefixed title and correct provider/model (`ollama`/`qwen2.5-coder:7b` for text kinds, `huggingface`/`black-forest-labs/FLUX.1-schnell` for image kinds); `AssetReview` (approve a text-kind `VIDEO` asset), `AssetVersion` (regenerate a `CAPTIONS` asset — new row created, version bumped to 2, full lineage correct, the original row's `APPROVED` status and version 1 unchanged), `duplicate` (text-kind → true independent row copy, confirmed no provider call; image-kind → live re-generation, confirmed a new provider call and a new stored file), a QA batch-approve action, and delete (via the Asset Library endpoint) all worked correctly on `VIDEO` assets. Regression: `POST /content/generate` (no brand kit) still works byte-for-byte as before. All test data cleaned up via a single project cascade-delete afterward.

## Decisions Made

- **No `VideoScriptProvider` registry for the six text kinds.** The original plan (written at the close of Sprint 6.1, before this phase's own research) called for a registry mirroring `ImageProviderFactory`. Investigation this phase found `.claude/decisions/ADR-0001-single-ai-provider-no-gateway.md`: the production VPS is CPU-only with no headroom to run a second model concurrently, so `ContentService` calls `ChatService`/`OllamaProvider` directly with no registry at all — `ImageProviderFactory` is a real registry specifically because image generation has multiple genuinely different real backends today. A registry for text-based video artifacts would, if built, hold exactly one entry — the speculative abstraction both ADR-0001 and this repo's own CLAUDE.md ("never introduce unnecessary dependencies") argue against. Confirmed with the user before implementation: `VideoAssetService` calls `ChatService` directly for text kinds, and `ImageProviderFactory` for the two image kinds — the actual real, current need. `VideoAssetService`'s public `generate()` contract doesn't expose this choice, so a real second text backend could still be introduced later as an internal swap, not an API change.
- **One `VideoAsset` table, one `AssetType.VIDEO` value, eight `VideoAssetKind`s.** Considered giving each kind (or each kind category) its own `AssetType` value, the way `ContentType`'s five values each get their own. Rejected: `ContentType`'s split reflects genuinely different content genres; the eight video kinds are all facets of one production process for one video, and — more concretely — every other single-table asset source in this codebase (Brand Kits, Images, regardless of format) gets exactly one `AssetType` value. `VideoAssetKind` is an internal discriminator, surfaced in the Asset Library only via the title/preview text, not a new top-level filter dimension.
- **No `VideoProject` entity; `videoGroupId` is a plain string column, not a relation.** Reaffirms the correction already made at the close of Sprint 6.1, before this phase's schema was written.
- **Regeneration is supported for `VIDEO`, unlike `BRAND_KIT`/`PROMPT_TEMPLATE`.** A video asset — both text and image kinds — is provider/AI-generated, exactly like content and images; `PROMPT_TEMPLATE`/`BRAND_KIT` are the only two asset types that are user-authored, which is the actual reason regeneration doesn't apply to them, not something specific to being text vs. image.
- **`BrandKitSelect` built now, but not retrofitted onto Content/Image generation forms.** Discovered mid-phase: Sprint 6.1 wired `brandKitId` into both generation *endpoints* but never added a picker to either generation *form* (`grep -rli brand` returns nothing in `components/generator/` or `components/image-generator/`). Video Studio needs a picker regardless, so one was built as a small, reusable component under `components/brand-kits/` (not `components/video-studio/`) specifically so it can be dropped into the other two forms later without moving files — but doing so now was judged out of scope for a phase about video, not brand kits.

## Follow-ups for Future Sprints

- Retrofit `BrandKitSelect` onto the existing Content and Image generation forms, closing the gap discovered this phase.
- Real `VIDEO_SYSTEM_PROMPTS` prompt-engineering iteration — the six per-kind system prompts were written and validated to produce structurally correct output (a numbered shot list, a scene-by-scene breakdown, etc.) but haven't been tuned beyond that first pass.
- A `GET /video-assets/groups` aggregation endpoint, if a project's video count grows large enough that client-side derivation of distinct `videoGroupId`s stops being cheap — same scale boundary already documented for Asset Library's own in-memory aggregation.
- Sprint 6.3 (Creative Review Workspace) — per the approved Sprint 6 plan.
