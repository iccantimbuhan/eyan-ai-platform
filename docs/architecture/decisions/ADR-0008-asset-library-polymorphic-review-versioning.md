# ADR-0008 — Asset Library: Polymorphic Review/Version Tables, Not a Unified Asset Table

## Context

Sprint 5 needed a QA review lifecycle (Draft/Needs Review/Approved/Rejected/Published, with a checklist, reviewer, notes, and QA score) and version history, applying uniformly across three independent sources — `GeneratedContent`, `GeneratedImage`, and (newly) project-scoped `SavedPrompt` rows — plus a stated requirement that a future fourth source (video) can be added "without refactoring."

The obvious first design is a single, unified `Asset` table that generation writes into directly, replacing or wrapping `GeneratedContent`/`GeneratedImage`. That was explicitly rejected during the requirements discussion: "Do not redesign existing modules. Extend them," and specifically, "avoid refactoring the existing GeneratedContent and GeneratedImage models during this sprint." Both tables are live, already tested, and already correct for what they do (generation, not review/versioning) — touching their shape for a feature that's orthogonal to generation was judged higher-risk than the alternative below.

## Decision

Two new, purely additive tables, both keyed on a discriminator plus the source row's own id — never a foreign key to a single unified table, since no such table exists:

- `AssetReview(assetType, sourceId, status, reviewerId, reviewedAt, notes, qaScore, checklist)` — `@@unique([assetType, sourceId])`. One row per asset that has ever been reviewed. An asset with no row is implicitly `DRAFT`.
- `AssetVersion(assetType, sourceId, lineageId, versionNumber, previousVersionId)` — `@@unique([assetType, sourceId])`, `previousVersionId` self-referential. One row per generated version, created only when an asset is actually regenerated. `lineageId` is shared by every version in one regenerate chain (set to the first version's own id via a create-then-update, since a row's id isn't known before insert) so fetching full history is a single indexed `findMany`, not a chain walk.

`GeneratedContent` and `GeneratedImage` gain **zero** new columns for either concern. The one exception, made consciously and separately, is `generationTimeMs` — added to both tables because Asset Details needs to display generation time and there is no way to derive it after the fact; it required instrumenting `ContentService.generate()`/`ImageService.generate()` to capture it at the moment of the call. This is unrelated to the review/versioning design and would have been needed under a unified-`Asset`-table design too.

Aggregation (`GET /assets`) is done in the service layer, not the database: `AssetService.list()` fetches from each source repository in parallel, maps to a common `AssetSummaryDto`, and merges/filters/sorts/paginates in memory. See `docs/ASSET_LIBRARY.md` for the full mechanics and its explicitly documented scale boundary.

## Alternatives Considered

- **Unified `Asset` table, generation writes into it directly.** Rejected per the constraint above — this is the "redesign existing modules" option explicitly ruled out, and would touch two already-correct, already-tested services (`ContentService`, `ImageService`) for a feature that doesn't need to know how generation works.
- **Add `status`/`reviewerId`/`notes`/etc. columns directly to `GeneratedContent` and `GeneratedImage`.** Rejected — doubles the review columns (once per table) instead of once, doesn't extend to `SavedPrompt` or a future `Video` table without repeating the same column set a third and fourth time, and still touches the two existing tables' shape.
- **A unified `Asset` table populated by triggers or a sync job, read-side only.** Considered and rejected as unnecessary complexity — a polymorphic `(assetType, sourceId)` key achieves the same "treat every source uniformly" goal without a synchronization mechanism that could drift from the source tables.
- **Database-level `UNION ALL` view for aggregation, from the start.** Rejected for this sprint — real added complexity (raw SQL, harder to test, loses Prisma's type safety) for a demo-scale portfolio project where an in-memory merge is fast enough and fully covered by ordinary repository/service tests. Documented as the explicit next step if data volume ever requires it.

## Consequences

Adding a future asset type (e.g. video) is: one enum value, one migration, one pair of mapper functions, one more branch in `AssetService`'s handful of switches — never a change to `GeneratedContent`, `GeneratedImage`, or any other existing model's shape. `AssetReview`/`AssetVersion` rows are cheap and rare (only created on first real review/regenerate), so most assets in a typical project carry no review/version overhead at all.

The cost: aggregation is O(sources) queries plus in-memory work rather than one SQL query, and lineage/version lookups occasionally require a follow-up per-row fetch of the underlying source (e.g. `listVersions()` looks up each version's own `GeneratedContent`/`GeneratedImage` row for provider/model, since each version is a genuinely distinct row) — acceptable at the data volumes this project operates at, called out explicitly in `docs/ASSET_LIBRARY.md` as the boundary to revisit if that changes.

`SavedPrompt.projectId` (nullable, additive) is the one existing table whose shape changed — a deliberate, separate, much smaller decision (see `docs/ASSET_LIBRARY.md`) to let a saved prompt optionally become a project asset without breaking the existing global Prompt Library page, which continues to read exactly as it did before this sprint.