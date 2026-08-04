# ADR-0010 — Publishing Pipeline: Independent Lifecycle, Provider Registry, No Background Execution

## Context

Sprint 6.4 adds a Publishing Pipeline: the ability to take an approved asset and publish it to an external platform, using a fake provider today with the architecture ready for future real integrations (Facebook, Instagram, LinkedIn, TikTok, YouTube, WordPress). The explicit instruction was to extend the existing Asset Library, not build a parallel system, and — critically — that publishing is **not** part of the QA review workflow: `ReviewStatus`/`AssetReview` must not be overloaded with publishing states.

Three decisions in this sprint are non-obvious enough to warrant recording.

## Decision 1: Publishing gets its own model and lifecycle, gated on but decoupled from QA

`ReviewStatus` already contains a `PUBLISHED` value (from Sprint 5), but nothing in the codebase ever set or read it as a real publishing signal — it was dead. Rather than finally wiring that value up, this sprint introduces a dedicated `PublishingRecord` model with its own `PublishingStatus` enum (`DRAFT/SCHEDULED/PUBLISHING/PUBLISHED/FAILED/ARCHIVED`), keyed on `(assetType, sourceId, platform)` — the same polymorphic addressing scheme `AssetReview`/`AssetVersion`/`AssetComment`/`AssetReviewAssignment` all use (ADR-0008).

The only connection between the two workflows is a service-layer gate: `AssetService.schedulePublish()`/`publish()` both read the current `AssetReview.status` and throw `AssetNotApprovedError` unless it's `APPROVED`. This is checked at call time, not enforced as a database constraint, because the two tables are deliberately independent — an asset can be un-approved after being scheduled, and the gate is re-checked at actual publish time for exactly that reason.

**Alternative considered and rejected**: reuse `ReviewStatus.PUBLISHED` and add publishing-specific columns to `AssetReview` (`platform`, `scheduledFor`, `externalUrl`, ...). Rejected per explicit instruction — QA and Publishing are stated to be two independent but connected workflows, and folding one asset's publishing state for *multiple platforms* into a single-row-per-asset table (`AssetReview` is `@@unique([assetType, sourceId])`) isn't structurally possible without a redesign anyway.

## Decision 2: Platform provider abstraction mirrors `ImageProviderFactory`, not `ProviderFactory`

Two provider-abstraction precedents already exist in this codebase, with opposite shapes:
- `ProviderFactory` (text generation, ADR-0001): a single hardcoded provider (`new OllamaProvider()`), no registry, because the production hardware genuinely only supports one AI vendor — provider *choice* isn't a real option.
- `ImageProviderFactory`: a `Map`-based registry (`register`/`create`/`listRegistered`/`reset`), because several real hosted alternatives (Gemini, ComfyUI, Hugging Face) were always expected.

Publishing platforms are unambiguously the second case — Facebook, Instagram, LinkedIn, TikTok, YouTube, and WordPress are named, real, near-term integration targets, not a hypothetical. `PlatformProviderFactory` therefore copies `ImageProviderFactory`'s exact shape: a static registry, `register(name, ctor)`, `create(name)` (throwing `UnsupportedPlatformProviderError` for an unregistered name), `listRegistered()`, `reset()` for tests. `FakePlatformProvider` mirrors `FakeImageProvider`: deterministic, no network calls, registered under `"fake"`, existing purely to exercise the pipeline end-to-end before a real, billable provider is integrated.

One deliberate difference from `ImageProviderFactory`: no `PLATFORM_PROVIDER` env var default. `IMAGE_PROVIDER` makes sense as a global default because a project usually wants one generation backend; publishing to multiple platforms per asset means there's no sensible single default — `platform` is always explicit, per `PublishingRecord`, matching how `ImageService.generate()` already supports an explicit per-call override independent of any env default.

## Decision 3: Scheduling is persisted intent only — no background execution infrastructure this sprint

Research confirmed no queue, cron, worker, or background-job library exists anywhere in this codebase, and ADR-0005 already documents a deliberate prior decision to keep generation synchronous within the HTTP request rather than build async infrastructure. Sprint 6.4's "scheduling" requirement was explicitly scoped, mid-sprint, to match that same posture: a `PublishingRecord` can carry `scheduledFor`/`status: SCHEDULED`, but nothing in the running process watches for due records and executes them. Execution only ever happens via an explicit call — the "Publish Now" user action, or a future "Run Due Publications" admin action — both of which are just the same `AssetService.publish()` core method.

`publish()` is deliberately written as the **single, stable entry point** a future background executor could call unchanged: it re-validates ownership and the `APPROVED` gate, resolves the record, calls the provider, and persists success/failure — nothing about its signature or behavior assumes it's being called from an HTTP request specifically. Adding real scheduling later (a queue, a poller, a cron-triggered endpoint) is additive work that calls this existing method, not a rewrite of it.

**Alternatives considered and rejected**:
- **A simple in-process `setInterval` poller** checking for due `SCHEDULED` records. Rejected — this would be the first background timer in the codebase's history, a genuine new runtime-behavior primitive that the user explicitly asked not to introduce this sprint, and interacts awkwardly with server restarts/tests/multi-instance deployment in ways that deserve their own dedicated design pass.
- **A real job queue library** (BullMQ, Agenda, etc.). Rejected for the same reason, at a larger scope — a new infrastructure dependency for a demo/portfolio-scale feature, deferred explicitly to a future sprint if/when it's actually needed.

## Consequences

- `ReviewEventType` gained four values (`PUBLISH_SCHEDULED`, `PUBLISH_STARTED`, `PUBLISHED`, `PUBLISH_FAILED`) — additive enum growth, the same safe pattern used for `REVISION_REQUESTED` in Sprint 6.3. Every publishing action feeds the existing `AssetReviewEvent` timeline; no second timeline implementation exists or is needed. `archivePublish()` deliberately writes no event — archiving is administrative bookkeeping, not a QA- or publish-relevant state transition.
- `AssetService`'s constructor grows to 16 positional arguments after this sprint (14 → 16, following ADR-0009's already-flagged growth). Kept as-is to match existing convention; a params-object refactor remains a legitimate, still-deferred future candidate, not something introduced incidentally here.
- Failure handling mirrors `ImageService.generate()`'s established convention exactly: a provider (or provider-lookup) failure is caught, persisted durably (`status: FAILED`, sanitized `errorMessage`, incremented `attempts`), and a generic `PublishingFailedError` is thrown — the raw error never reaches the HTTP response, only the stored record. Retry is user-initiated only (`retryPublish()`, allowed only from `FAILED`); there is no automatic retry-with-backoff, matching the same "no automation was ever needed here" posture as the rest of this sprint.
- A `SCHEDULED` record can sit indefinitely without publishing unless a user (or a future admin action) manually triggers it. This is the deliberately accepted scope boundary from Decision 3, not an oversight — called out explicitly in the sprint log and here.
- `PublishingQueue` is a new, separate frontend component from `ReviewQueue`, not a merged tab bar with two status dimensions — keeping QA and Publishing visually and conceptually distinct, per the "two independent but connected workflows" direction, even though both are built on the identical `useAssets(projectId, filters)` list endpoint and `AssetSummary` data.
- No new RBAC permission gate was added on the five new endpoints — they stay `authenticate`-only, consistent with every existing asset route and with ADR-0009's precedent that this repo's global RBAC governs page-level access, not per-resource collaboration.
