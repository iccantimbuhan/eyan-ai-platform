# Eyan Platform Architecture

Version: 1.0

---

# Overview

Eyan Platform is a modular AI chat application designed to support multiple Large Language Model (LLM) providers through a unified backend API.

The project follows a layered architecture that separates presentation, business logic, and AI provider integrations.

The primary goals are:

- Provider independence
- Modular architecture
- Easy feature expansion
- Clean separation of responsibilities
- Production-ready structure

---

# High-Level Architecture

```
Browser
    │
    ▼
React + Vite Frontend
    │
    ▼
API Service Layer
    │
    ▼
Express Backend API
    │
    ▼
Business Services
    │
    ▼
Provider Factory
    │
    ▼
LLM Provider
```

---

# Project Structure

```
backend/
frontend/
docs/
database/
docker/
```

---

# Frontend Architecture

The frontend follows a feature-first architecture.

```
src/

assets/
components/
config/
context/
features/
hooks/
lib/
routes/
services/
stores/
styles/
```

## Responsibilities

### features/

Contains business features.

Examples:

- AI Chat
- Authentication
- Dashboard
- Models
- Providers
- Settings
- Users

Each feature owns its own:

- components
- hooks
- configuration
- business logic

---

### components/

Reusable UI components.

No business logic should exist here.

---

### services/

Responsible for communication with the backend.

Current:

```
services/
    api.ts
```

Future:

```
services/
    api.ts
    auth.service.ts
    chat.service.ts
    model.service.ts
```

---

### stores/

Global application state.

Current:

```
auth-store.ts
```

Stores should contain UI/application state only.

Business logic belongs inside services.

---

### routes/

TanStack Router route definitions.

Protected routes should use authentication middleware and route guards.

---

# Backend Architecture

The backend follows a layered architecture.

```
Routes
    │
Controllers
    │
Services
    │
Providers
```

---

## Routes

Responsibilities:

- URL definitions
- request validation
- middleware

Current

```
health.routes.ts
chat.routes.ts
chat-stream.routes.ts
model.routes.ts
```

Future

```
auth.routes.ts
```

---

## Controllers

Controllers coordinate requests.

Responsibilities:

- receive request
- call service
- return response

Controllers should not contain business logic.

---

## Services

Business logic lives here.

Current

```
ChatService
HealthService
ModelService
```

Future

```
AuthService
```

---

## Providers

Providers abstract AI vendors.

Current

```
Ollama
```

Future

```
OpenAI
Anthropic
Gemini
OpenRouter
LM Studio
```

The rest of the application should never depend directly on a provider.

All communication happens through provider interfaces.

---

## Middleware

Current

```
error-handler.ts
```

Future

```
auth.middleware.ts
```

Middleware responsibilities:

- authentication
- authorization
- logging
- request validation

---

## Utilities

Utility modules contain reusable helpers.

Future utilities:

```
jwt.ts
password.ts
api-response.ts
```

---

# Request Flow

Chat request flow:

```
Browser

↓

API Service

↓

Express Route

↓

Controller

↓

Service

↓

Provider Factory

↓

Provider

↓

LLM

↓

Response
```

---

# Authentication Architecture

Authentication is intentionally separated from the AI modules.

Future structure:

```
Routes

↓

Auth Controller

↓

Auth Service

↓

JWT Utility

↓

Password Utility

↓

Database
```

Frontend:

```
Sign In

↓

Auth Service

↓

API

↓

Backend

↓

JWT

↓

Auth Store

↓

Protected Routes
```

---

# Provider Architecture

```
AIProvider Interface
        ▲
        │
 ┌──────┴──────────┐
 │                 │
Ollama         OpenAI
 │                 │
Anthropic      Gemini
```

Each provider must implement the same interface.

This allows switching providers without changing business logic.

---

# Image Provider Architecture

AI Image Studio (Sprint 4.1+) uses a separate provider abstraction from `AIProvider` above — image generation has no local/GPU option on this hardware, so multiple hosted providers are real, expected candidates (unlike text generation, which is deliberately single-provider).

```
ImageProvider Interface (generate(request) -> bytes)
        ▲
        │
 ┌──────┼──────────┬──────────────┬──────────────────┐
 │      │          │              │                  │
Fake  Gemini    ComfyUI     HuggingFace         (OpenAI/Stability/
      (real,    (real,      (real, hosted —      FLUX — planned)
       hosted —  self-       Sprint 4.4)
       Sprint    hosted —
       4.2       Sprint 4.3)
       Phase 1)
```

- `ImageProvider` — one method, `generate()`, returns image bytes. Never touches storage or the database.
- `ImageProviderFactory` — a registry (`register()` / `create()`), not a single-provider switch like `ProviderFactory`. Adding a provider is one new class plus one `register()` call; `ImageService`, routes, and validators never change.
- `StorageProvider` — persists bytes a provider produced (`LocalDiskStorageProvider` today). Fully independent of which `ImageProvider` produced them.
- `ImageService` — the only orchestrator. Calls a provider for bytes, calls storage to persist them, calls the repository to record metadata. Never knows which concrete provider or storage backend it's using.

Each real provider (`GeminiImageProvider`, `ComfyUIProvider`, `HuggingFaceProvider`, and later OpenAI/Stability/FLUX) also documents its own limitations against the shared `GenerateImageRequest`/`GenerateImageResponse` contract where a vendor doesn't support a field 1:1 (e.g. arbitrary width/height, negative prompts) — see each provider's own file and the sprint log that introduced it.

`ComfyUIProvider` (Sprint 4.3) is the first provider whose generation is asynchronous on the provider's own side — it submits a workflow, then polls for completion, rather than returning in a single HTTP round trip like Gemini. That asynchrony is fully contained inside the provider; `ImageService.generate()` still just calls `provider.generate()` and awaits one `Promise`, unaware that a submit-then-poll loop is happening underneath. It's also the first provider driven by an external, user-authored template (a JSON workflow graph, not backend code) rather than a hardcoded request mapping — see [COMFYUI_PROVIDER.md](COMFYUI_PROVIDER.md) for the workflow-template system this depends on.

`HuggingFaceProvider` (Sprint 4.4) is a third real provider, closer in shape to `GeminiImageProvider` (a single request/response round trip) than to `ComfyUIProvider`'s submit-then-poll. It's the first provider whose *health check* genuinely validates three independent things over the network — reachability, token validity, and model availability/permission — none of which touch the inference API itself (both calls it makes are free Hub metadata lookups), satisfying "a health check must not generate an image" while still being a real, live check rather than just a config-shape check. Both `ComfyUIProvider` and `HuggingFaceProvider` needed a random seed with no field for it in the shared `GenerateImageRequest` contract — factored into one shared `random-seed.util.ts` once the second provider needed the exact same one-line implementation, rather than duplicating it.

Generation itself goes through Hugging Face's official `@huggingface/inference` SDK (not a hand-rolled REST call — see [HUGGINGFACE_PROVIDER.md](HUGGINGFACE_PROVIDER.md#provider-migration) for why: Hugging Face's `hf-inference` provider dropped support for this provider's configured model outright, and each Inference Providers partner has its own bespoke request/response shape only the official SDK normalizes). `HUGGINGFACE_PROVIDER` (default `"auto"`) is passed straight through to the SDK, letting Hugging Face's own router pick whichever partner currently serves the configured model — `HuggingFaceProvider` itself never assumes a specific one.

---

# Asset Library & QA Architecture

Sprint 5 adds a management layer over what Content Studio already generates — an Asset Library (search/filter/batch-act) and a QA review workflow (Draft → Needs Review → Approved/Rejected → Published) — spanning three independent sources (`GeneratedContent`, `GeneratedImage`, project-scoped `SavedPrompt`) without redesigning any of them.

```
GET /assets  ──►  AssetService.list()
                       │
       ┌───────────────┼────────────────────┐
       │                │                    │
ContentRepository  ImageRepository   SavedPromptRepository
  (unchanged)         (unchanged)      (.projectId added)
       │                │                    │
       └───────────────┬────────────────────┘
                        ▼
              asset.mapper.ts (per-type mapping
              to one common AssetSummaryDto)
                        │
                        ▼
        merge review status (AssetReview, new)
        + version number (AssetVersion, new)
                        │
             search / filter / sort / paginate
                    (in application code)
```

`AssetReview` and `AssetVersion` are new, purely additive tables, both keyed on `(assetType, sourceId)` rather than a foreign key into a unified table — no such table exists, and none was introduced. An asset with no `AssetReview` row is implicitly `DRAFT`; one with no `AssetVersion` row is implicitly version 1. Neither row is created until an asset is actually reviewed or regenerated. `AssetType`'s first five values mirror `ContentType` exactly, plus `IMAGE` and `PROMPT_TEMPLATE` — the two other real sources this sprint aggregates.

Generation itself is completely untouched: `AssetService.regenerate()`/`.duplicate()` call `ContentService.generate()`/`ImageService.generate()` unchanged, then link the resulting row into `AssetVersion` (regenerate) or don't (duplicate — an independent asset, not a new version). The one exception is `generationTimeMs`, a new nullable column on both `GeneratedContent` and `GeneratedImage`, captured by timing the existing provider call — needed because Asset Details displays generation time and it can't be reconstructed after the fact.

Full design rationale, the "why not a unified Asset table" reasoning, and the exact recipe for adding a future asset type: `docs/ASSET_LIBRARY.md` and `docs/architecture/decisions/ADR-0008-asset-library-polymorphic-review-versioning.md`.

---

# MCP Foundation Architecture

Sprint 7.1 adds the MCP Foundation — the reusable integration layer future automation providers (Canva, CapCut, GitHub, Docker, Filesystem, Google Drive, Slack, Discord, Notion, PostgreSQL, Redis, n8n) will register into. No real provider is implemented yet; only a deterministic `FakeMcpConnector` exists, the same role `FakeImageProvider` played before Sprint 4.2's first real image provider.

```
McpConnector Interface (connect / listTools / callTool / disconnect / healthCheck)
        ▲
        │
   ┌────┴─────┬──────────┬─────────┬── ... (Canva/GitHub/Docker/Slack/... — future sprints)
   │           │          │         │
 Fake       Canva      GitHub    Docker
(real,     (future)   (future)  (future)
 Sprint
 7.1)
```

- `McpConnector` — one interface, five methods. `McpConnectorFactory` — a registry (`register()`/`create()`/`listRegistered()`/`reset()`), mirroring `ImageProviderFactory`'s shape exactly, with one deliberate difference: `create()` has **no env-var default** (mirroring `PlatformProviderFactory` instead), since many MCP servers are meant to run simultaneously — there is no single "the" MCP provider a call could default to. Adding a real connector later is one class + one `register()` call, zero changes to `McpConnectorFactory`, any service, any route, or any validator.
- `AutomationConnection` — an encrypted, user-owned credential (AES-256-GCM, `encryptedCredentials`/`credentialsIv`). Strictly private to its owner at every layer: the repository's `findById(id, userId)` is owner-scoped, and no API response ever includes the raw credential. Only `CredentialManagerService` touches the encryption key or the crypto primitives anywhere in the codebase — connectors receive an already-decrypted `McpConnectorConfig.credentials` object, never the ciphertext.
- `McpServerConfig` — a platform-level (not per-user) registered server instance, referencing an `AutomationConnection` via optional `connectionId` when the provider needs auth. Owns its own health snapshot (`healthStatus`/`lastHealthCheckAt`/`lastHealthMessage`).
- `McpHealthService` — orchestrates a connector's `connect()` → `healthCheck()` → `disconnect()` lifecycle and persists the result; the connector itself never writes to the database, the same split `ImageService` already has with `ImageProvider` (a provider only ever returns bytes/a result, the service decides what to do with it).
- `AutomationAuditService` — the single, standardized entry point every other MCP Foundation service calls to write an audit row (`AutomationAuditEvent`, append-only, same posture as `AssetReviewEvent` — see ADR-0009) — no service imports `AutomationAuditEventRepository` directly.

**RBAC**: two new permissions, `automation` (page-level read access, matching this repo's usual coarse convention) and `automationcredentials` (gates every mutation of a credential-bearing resource — creating/updating/deleting/rotating an `AutomationConnection`, registering/updating/removing an `McpServerConfig`) — a deliberate, narrower exception to the otherwise page-level RBAC model, justified by what's actually at stake (another party's live credential). Audit log routes reuse the pre-existing, previously-unwired `auditlogs` permission rather than inventing a third one.

**API**: `/api/v1/automation/{connections,mcp-servers,audit-logs}` — see `backend/src/routes/v1/automation-*.routes.ts`. No `/connections/:id/reveal` route exists anywhere, by design — `AutomationConnectionService.reveal()` is real and tested but is only ever called by system-internal code, never exposed over HTTP.

**Frontend**: `features/automation/` — Providers (read-only registry listing), Connections, MCP Servers, Health (reuses the MCP Servers query, since health fields already live on that same row), and Audit Logs pages, under a new "Automation" sidebar group. Contains no business logic — credentials are entered as generic JSON and sent to the backend as plaintext over HTTPS for server-side encryption; permission checks (`useCan`) mirror the backend's actual route gates and are a UI convenience, never a security boundary.

Full design rationale — why the registry mirrors `PlatformProviderFactory` rather than `ImageProviderFactory`, why connectors never decrypt credentials, why business logic stays in services, and how a future real provider should integrate: `docs/architecture/decisions/ADR-0012-mcp-foundation.md`. (A real Canva provider was the next step assumed when Sprint 7.1 closed — Sprint 7.2 was since redirected to the AI Video Editing Pipeline below; Canva/GitHub/Docker/etc. remain valid, un-started future work.)

---

# CRM Foundation Architecture

Sprint 1 adds **CRM Foundation** — positioned as the first pillar of a future Sales Workspace (Leads today; Contacts, Companies, Deals, Tasks, Activities, Reports/Analytics later), not a one-off feature. `docs/product/02_ROADMAP.md` lists CRM as out of scope for Version 1.0 — this is a parallel initiative, approved via a dedicated Technical Design Document (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) rather than a resumption of that scope.

```
Lead Form (external, not built this sprint)
        │  POST /api/v1/crm/leads  (public, rate-limited, validated)
        ▼
      Lead  (status: NEW)
        │
        │  rep-driven, server-enforced transitions (CrmLeadService.ALLOWED_TRANSITIONS)
        ▼
NEW → VALIDATED → AI_ANALYZED → QUALIFIED → CONTACTED → NEGOTIATION → CONVERTED
  │                    │             │           │            │
  └→ DISQUALIFIED      └─────────────┴───────────┴────────────┴──→ LOST
```

- `Lead` — shared workspace (no per-row ownership, same posture as `Expense` — see ADR-0018), gated by a single `crm` permission. `assignedToId` records the responsible rep, never used for access control.
- `LeadActivity` — one append-only timeline serving both "Activity History" and "Automation History" (`NOTE`/`STATUS_CHANGE`/`ASSIGNMENT`/`AI_ANALYSIS`/`AUTOMATION`), filtered by type in the UI rather than split into two tables. Status/assignment changes await this write rather than firing-and-forgetting it, unlike Finance's audit log — see ADR-0018 Decision 3.
- `LeadAiAnalysis` / `WorkflowExecutionLog` — schema exists now, populated by nothing until n8n integration begins (Sprint 2/3). `WorkflowExecutionLog.domain` (default `"crm"`) is platform-wide from day one, not CRM-owned, so a future automation domain (support, recruitment, invoicing) reuses the same table.
- `CrmLeadService` owns the lifecycle transition map — the only place that decides which status changes are legal; controllers and the frontend never re-derive it independently (the frontend's copy in `features/crm/lib/lead-lifecycle.ts` is display-only).

**RBAC**: one permission, `crm`, gating the entire module — the Finance shared-workspace pattern, not the Automation module's two-tier (page-level + credential-mutation) pattern, since nothing in CRM Foundation touches another party's live credential.

**API**: `POST /api/v1/crm/leads` is public (no `authenticate`) — the Lead Form's intended submission target, protected instead by a dedicated rate limiter and full input validation, since it's the actual internet-facing attack surface (host firewall is disabled; nginx binding + this endpoint's own guards are the real perimeter). Every other route under `/api/v1/crm/leads` requires `authenticate` + `requirePermission("crm")`. See `backend/src/routes/v1/crm-leads.routes.ts`.

**Frontend**: `features/crm/` — a Dashboard (pipeline stat cards + status breakdown chart), Leads (searchable/filterable table), and Lead Detail (AI Analysis empty-state card, Timeline with inline note entry, Status/Assign dialogs, Edit dialog) under a new "Sales" sidebar group. Built entirely from existing `components/ui/*` and `components/data-table/*` — no new design-system components. Unchanged by Sprint 2 — nothing here is a frontend sprint.

Full design rationale — why `LeadActivity` is one table not two, why the AI-analysis models exist unused, why the lifecycle map lives where it does, and why the service-facing routes were deferred out of Sprint 1: `docs/architecture/decisions/ADR-0018-crm-foundation.md`. Full architecture/business-requirements context: `/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`.

## Sprint 2 — Automation Integration Contract (EYAN side only)

Sprint 2 builds the EYAN half of the cross-system contract ADR-0019 specifies — `eyan-automation-hub` (n8n's actual Workflow 1/2 JSON definitions) is explicitly out of scope this sprint and untouched; everything below is verified with curl standing in for n8n, not a live Automation Hub instance.

```
Lead created (POST /api/v1/crm/leads)
        │
        │  fire-and-forget, HMAC-signed (AutomationWebhookService)
        ▼
  n8n Workflow 1 — Lead Intake        (eyan-automation-hub, not built this sprint)
        │
        ▼
  n8n Workflow 2 — Validation         (eyan-automation-hub, not built this sprint)
        │  GET  /api/v1/crm/service/leads?email=            (dedupe check)
        │  PATCH /api/v1/crm/service/leads/:id/validation    (VALIDATED | DISQUALIFIED)
        ▼
  "Workflow 3+4" stand-in — a dummy/stub qualification payload, exercised via curl this sprint
        │  PATCH /api/v1/crm/service/leads/:id/qualification (writes LeadAiAnalysis + AI_ANALYZED)
        ▼
      Lead  (status: AI_ANALYZED, score, priority set)
```

- **`authenticateService`** (`backend/src/middleware/service-auth.middleware.ts`) — gates every `/api/v1/crm/service/*` route with a static bearer token (`AUTOMATION_SERVICE_API_KEY`), compared via `crypto.timingSafeEqual`. Fails closed (500) if the key isn't configured, rather than authenticating every caller against an empty value. Named at the platform level, not CRM-specific — a future automation domain reuses it unchanged (ADR-0018 Decision 6).
- **Outbound webhook dispatch** (`AutomationWebhookService`) — `CrmLeadService.create()` fires an HMAC-SHA256-signed (`AUTOMATION_WEBHOOK_SIGNING_SECRET`), fire-and-forget POST to n8n's future Lead Intake webhook on every new lead. Never awaited, never blocks the Lead Form's response; a failure is logged and nothing else happens (no retry — that's n8n's job, once it exists).
- **`CrmAutomationIngestService`** (`backend/src/services/crm-automation-ingest.service.ts`) — the n8n write-back surface, separate from `CrmLeadService` (user-facing CRUD) since the two have different callers and different idempotency needs, but both defer to the same `ALLOWED_TRANSITIONS` map (imported, not duplicated) as the one lifecycle authority.
- **Idempotency**: every service mutation carries a `workflowExecutionId` + `workflowName`; a repeated call whose execution already succeeded (checked against `WorkflowExecutionLog`) is treated as a safe replay and returns the current state unchanged rather than re-applying the mutation.
- **The "dummy qualification response"**: `PATCH /crm/service/leads/:id/qualification` is the real Workflow 3/4 write-back contract, exercised this sprint with a stub payload instead of a real AI call — proving the contract (auth, signing, idempotency) before Sprint 3 adds actual AI orchestration.

Full contract decisions (webhook auth, service auth, retry/timeout/idempotency/versioning policy, and rejected alternatives): `docs/architecture/decisions/ADR-0019-automation-integration-contract.md`.

**Explicitly not built this sprint** (deferred to a later, dedicated Automation Hub sprint): the actual n8n Workflow 1/2 JSON definitions in `eyan-automation-hub`, real AI qualification (Workflow 3), notifications (Workflow 5), execution telemetry (Workflow 6), the Human Review Queue UI, and the Automation module's future "Automation Runs" page.

---

# AI Video Editing Pipeline Architecture

Sprint 7.2 extends the existing AI Video Studio (above) with a pipeline that lets a user upload a real video file and, in later milestones, describe edits to it in plain English. Milestone 1 (Source Ingestion, Sprint 7.2.1) is the only part built so far — no planner, execution engine, FFmpeg editing, Whisper, or background job infrastructure exists yet.

```
VideoAssetKind
   ├─ SCRIPT / SCENE_BREAKDOWN / ... / STORYBOARD / THUMBNAIL   (Sprint 6.2 — AI-generated)
   ├─ UPLOADED_SOURCE                                            (Sprint 7.2.1 — a real uploaded file)
   └─ EDITED_VIDEO                                                (reserved — a later milestone's pipeline output)
```

Every kind, old or new, is still one `VideoAsset` row surfaced under the same `AssetType.VIDEO` — Review, Publishing, and Analytics needed zero code changes for the new kinds beyond one label added to `asset.mapper.ts`'s existing `VIDEO_KIND_LABELS` map, the same recipe ADR-0008 already established.

**Upload path** (`POST /api/v1/video-edit/sources`): `video-upload.middleware.ts` (multer, **disk storage, never memory storage**) streams the multipart body straight to `env.videoUploadTempDir` → `VideoSourceService.ingest()` verifies project ownership, validates the extension, and calls `probeVideoFile()` (`ffprobe.util.ts`) → `StorageProvider.save({ sourcePath })` moves the file into the storage root (`rename()`, `EXDEV` copy+unlink fallback) → a `VideoAsset(kind: UPLOADED_SOURCE, status: COMPLETED)` row is created with the real metadata `ffprobe` extracted (`durationMs`/`videoFormat`/`sourceFileName`, plus `width`/`height` on the existing columns).

This is a synchronous request/response operation, not a background job — `ffprobe` is fast enough that there's no need for the PENDING-then-update lifecycle `ImageService`/`VideoAssetService.generate()` use for slow provider calls. A later milestone's execution engine (multi-step, genuinely long-running FFmpeg/Whisper/CV work) is expected to need real background-job infrastructure, which doesn't exist anywhere in this codebase yet — deliberately not built ahead of that need.

**Why `StorageProvider` gained `sourcePath` instead of a parallel upload-storage path**: `SaveFileInput` previously only accepted an in-memory `buffer` — fine for provider-generated image bytes, but buffering a multi-hundred-MB video upload in Node memory risks tripping the backend's real PM2 `max_memory_restart` ceiling (500MB — see `ecosystem.config.cjs`). `sourcePath` is a minimal, additive alternative on the same interface (`LocalDiskStorageProvider.save()` picks whichever input it was given), not a new storage abstraction.

**Why `ffprobe` is more than a metadata reader**: it's also the authoritative validation that an uploaded file is really a video — a file that merely has a video-sounding extension or client-supplied mimetype but isn't a real video fails `ffprobe`'s parse with a clean, sanitized `InvalidVideoFileError`, before it can ever become a `VideoAsset` row. The multer `fileFilter`'s mimetype allowlist is a cheap first-pass rejection only, not the real check — the same "don't trust client-supplied metadata" posture this repo already takes with uploaded file extensions in `LocalDiskStorageProvider`.

Full milestone-by-milestone detail: `tasks/completed/sprint-7-2-1-source-ingestion.md`.

---

# AI Core Foundation Architecture

Phase 1 adds **AI Core** — a new platform module, structured as MCP Foundation's sibling, that every business module (starting with a future CRM/Content/Video migration in Phase 2) is meant to route AI calls through instead of each hardcoding a provider directly. It deliberately supersedes ADR-0001 ("Single AI Provider, No Gateway") for text/chat generation specifically — ADR-0001 itself anticipated this outcome and left the door open rather than closed it; AI Core is that door, opened now that a second real consumer (CRM's Sales Brain, planned for Phase 3) actually needs it.

```
Business Module / n8n Workflow
        │  invoke(capabilityKey, input)
        ▼
AiCapability      (business task: "lead-qualification", ... — the only thing a caller ever references)
        │
        ▼
AiBrain           (reusable AI configuration — provider, model, prompt, routing policy; one Brain may back several Capabilities)
        │
        ▼
AiRoutingService  (resolves + caches Policy → Provider/Model → Prompt, executes retry/fallback, classifies outcomes)
        │
        ▼
AiCoreProviderFactory → AiCoreProvider plugin (Ollama / OpenAI / Anthropic / Gemini — thin, translates request/response only)
```

- `AiCapability` / `AiBrain` — the two-level indirection the architecture is frozen on (`docs/architecture/decisions/ADR-0021-ai-core-foundation.md`): a Capability is a business task, always resolving to exactly one Brain; a Brain is a reusable AI configuration, never referenced by a business-module caller directly (Brain-direct invoke is `aicoreadmin`-gated, administrative/Playground-only). `AiCapability.brainId` uses Prisma's default `Restrict` delete behavior on purpose — deleting a Brain that still backs an enabled Capability fails loudly rather than orphaning it silently, since this schema has no soft-delete anywhere to paper over a dangling reference.
- `AiCoreProviderFactory` (`backend/src/providers/ai-core-provider.factory.ts`) — mirrors `McpConnectorFactory`'s registry shape exactly (`register()`/`create()`/`listRegistered()`/`reset()`, **no env-var default**), not `ImageProviderFactory`'s — every real caller (`AiRoutingService`) always resolves an explicit `AiProvider.key` from a Brain's active `AiRoutingPolicy` before calling `create()`, so there's never a scenario needing a global default the way `IMAGE_PROVIDER` exists for image generation. Four plugins are registered: `OllamaAiProvider` (LOCAL, no credential — relocated/generalized from the existing `OllamaProvider`, unchanged wire contract), `OpenAiAiProvider`, `AnthropicAiProvider`, `GeminiAiProvider` (all HOSTED, REST-only via `axios`, no new SDK dependency). Each implements `chat()` and a cheap `healthCheck()` (mirrors `McpConnector.healthCheck()`, applied to a text-generation provider instead of an MCP server).
- `AiRoutingService` — the only component that talks to `AiCoreProviderFactory`. Resolves Capability → Brain → active `AiRoutingPolicy` → active `AiPrompt`, builds messages via `{{placeholder}}` substitution against the caller's input, and executes a corrective-retry loop (feeding the model its own bad output + the parse error back on a `SCHEMA_INVALID` classification) up to the policy's `maxRetries`, then one attempt against a configured fallback provider/model if the preferred path is exhausted or definitively failed. Never throws an unhandled error back to the caller — an exhausted call returns `needsManualReview: true` instead ("never strand a caller," generalizing CRM's own Workflow 3 principle). Failure classification (`SCHEMA_INVALID` / `TRANSIENT_FAILURE` / `DEFINITIVE_FAILURE`) mirrors `eyan-automation-hub`'s Classify Ollama Result node: a 4xx status (except 429) is definitive (no retry), everything else (network failure, 429, 5xx) is transient.
- **Caching**: an in-process, in-memory `Map`-based cache (no Redis) holds the resolved Capability→Brain→Policy→Prompt chain, invalidated wholesale on a `CACHE_INVALIDATING_ACTIONS` `AiAuditEvent` (`ai-cache-invalidation.events.ts`, a plain Node `EventEmitter` — decouples `AiAuditService`, which knows *when* something changed, from `AiRoutingService`, which knows *what* to do about it). A Playground call always bypasses this cache — an override must never be served or pollute cached resolution state.
- `AiPlaygroundService` / domain-tagged `AiUsageLog` — the engineering validation environment. Every Playground execution writes one `AiUsageLog` row tagged `domain: "ai-core-playground"` instead of `"ai-core"` (no duplicate logging system); `GET /ai-core/usage` and `GET /ai-core/costs` filter to `domain: "ai-core"` by default, so Playground traffic never inflates production numbers.
- `AiProviderHealthService` — actually populates `AiProvider.healthStatus`/`lastHealthCheckAt`/`lastHealthMessage` (a real gap the Phase 0.5 review caught: the fields existed with no owning service). Mirrors `McpHealthService`'s real behavior, not just its role.
- `CredentialManagerService` reused verbatim for `AiProviderCredential` (AES-256-GCM, `AUTOMATION_ENCRYPTION_KEY`) — zero new cryptography, same as MCP Foundation.

**RBAC**: two new permissions, `aicore` (read/use — includes invoking a Capability) and `aicoreadmin` (mutate — Brain/Capability/Provider/Model CRUD, credential management, routing policy and prompt version changes, Brain-direct invoke, and every Playground execution), mirroring `automation`/`automationcredentials`'s two-tier split for the same reason (a credential-bearing module). `GET /ai-core/audit-logs` reuses the pre-existing `auditlogs` permission.

**API**: `/api/v1/ai-core/{capabilities,brains,providers,models,playground,usage,costs,health,audit-logs}` — see `backend/src/routes/v1/ai-core-*.routes.ts`. `POST /ai-core/capabilities/:capabilityKey/invoke` is the one endpoint every business module/n8n workflow is meant to call (`aicore` only); `POST /ai-core/brains/:brainKey/invoke` and `POST /ai-core/playground/invoke` are `aicoreadmin`-gated administrative paths. Prompts and Routing Policies are nested under a Brain (`/ai-core/brains/:brainId/prompts`, `/ai-core/brains/:brainId/routing-policy`), additive-versioned with an `activate` action rather than an edit-in-place, matching ADR-0020 Decision 2's file-versioning rule now enforced in the database.

**Frontend**: `features/ai-core/` — Dashboard, Capabilities, Brains, Providers (with health-check and credential-add actions), Models, Playground (functional Capability/Brain invoke form with provider/model/prompt overrides, structured-output and raw-response viewers, execution history), Usage, Costs, Health, and Audit Logs pages, under a new "AI Core" sidebar group. Prompt/Routing Policy management for a given Brain is reached via the API only in Phase 1 (no dedicated Brain-detail sub-page yet — see the Phase 1 completion report's Known Issues).

**Phase 1 is purely additive**: zero changes to `ChatService`, `ContentService`, `VideoWorkflowPlannerService`, `VideoAssetService`, or `eyan-automation-hub` Workflow 3 — all continue exactly as built. Phase 2 (migrating those call sites to Capabilities, one at a time) and Phase 3 (re-pointing Workflow 3 at AI Core over HTTP) are named, sequenced, and explicitly not started.

Full design rationale — the Capability/Brain two-level indirection, the ADR-0001 supersession, the Playground isolation guarantee, and the full Phase 0/0.5/Freeze history: `docs/architecture/decisions/ADR-0021-ai-core-foundation.md`. Full TDD: `/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`.

---

# Design Principles

## Separation of Concerns

Each layer has one responsibility.

---

## Provider Independence

Business logic should never depend on a specific AI provider.

---

## Feature Isolation

Each feature owns its own UI and feature-specific logic.

---

## Thin Controllers

Controllers coordinate.

Services decide.

Providers execute.

---

## Single Responsibility

Each file should solve one problem.

---

# Planned Roadmap

Phase 1

- Repository cleanup
- Documentation
- Architecture

Phase 2

- Authentication
- JWT
- User management

Phase 3

- Conversations
- Chat history
- Streaming

Phase 4

- Multiple AI providers

Phase 5

- RAG
- Tool Calling
- Agents

Phase 6

- Production Deployment

---

# Engineering Rules

- Prefer TypeScript.
- Keep controllers thin.
- Keep business logic inside services.
- Use provider abstraction.
- Never duplicate implementations.
- Extend existing architecture instead of replacing it.