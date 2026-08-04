# AI Core Foundation — Phase 1

Status: Completed

## Goal

Implement the AI Core Foundation exactly as approved through Phase 0 (Technical Design Document) → Phase 0.5 (Architecture Review) → Architecture Freeze, per `docs/architecture/decisions/ADR-0021-ai-core-foundation.md`. Zero changes to any existing AI call site (`ChatService`, `ContentService`, `VideoWorkflowPlannerService`, `VideoAssetService`, `eyan-automation-hub` Workflow 3) — this phase is purely additive infrastructure. `eyan-automation-hub` is untouched entirely (out of scope until Phase 3).

## Scope

### In Scope

- Prisma schema: `AiProvider`, `AiProviderCredential`, `AiModel`, `AiBrain`, `AiCapability`, `AiPrompt`, `AiRoutingPolicy`, `AiBrainMcpTool`, `AiUsageLog`, `AiEvaluation`, `AiAuditEvent` + 5 enums.
- `AiCoreProviderFactory` registry + 4 provider plugins (Ollama, OpenAI, Anthropic, Gemini).
- Full service layer: Capability, Brain, Routing (with in-memory caching + event-driven invalidation), Prompt, Routing Policy, Playground, Provider (+ credentials), Model, Provider Health, Usage, Audit, Evaluation, Brain-MCP-Tool.
- Full API layer: repositories, DTOs/mappers, validators, controllers, routes, mounted at `/api/v1/ai-core/*`.
- RBAC: `aicore`/`aicoreadmin` permissions, seeded and granted to Owner; frontend `permissionCategories` registration (plus the pre-existing `finance`/`automation`/`automationcredentials` registration gap, per the TDD §19 recommendation to fix it in the same pass).
- Frontend: `features/ai-core/` module — 10 pages, hooks, API client, zod schemas, status badges — under a new "AI Core" sidebar group.
- Backend tests: `AiRoutingService` (12 tests — happy path, retry, fallback, definitive-failure short-circuit, confidence tiers, caching, cache invalidation, admin/Playground isolation), `AiAuditService` (cache-invalidation event emission), `AiProviderRepository`, `AiCapabilityController`.

### Out of Scope (explicitly deferred)

- Phase 2 (migrating `ChatController`/`ContentService`/`VideoWorkflowPlannerService`/`VideoAssetService` to Capabilities) and Phase 3 (`eyan-automation-hub` Workflow 3 re-pointing) — both require separate, explicit approval per ADR-0021.
- Real memory/RAG, evaluation depth beyond structural-shape checking, provider health history, rate-limit enforcement, Agent Framework, multi-agent/Brain-to-Brain composition — all named in the schema (reserved enum values / `rateLimitPerMinute` column) but not built.
- A dedicated Brain-detail sub-page (Prompt Library / Routing Policy tabs) in the frontend — Phase 1 manages Prompts and Routing Policies via the API only; the list/CRUD pages for Capabilities, Brains, Providers, and Models are the real, working UI surface this phase ships.
- Live verification of the OpenAI/Anthropic/Gemini plugins against real API keys — no keys were available this session. All three are thin REST implementations (same shape as the working `OllamaAiProvider`), typechecked and boot-verified, but not exercised against a live upstream. Ollama itself was not re-verified live either (no running local Ollama instance this session) — the plugin is a direct generalization of the already-verified `OllamaProvider` (ADR-0007), unchanged wire contract.

## What Shipped

See `docs/architecture/decisions/ADR-0021-ai-core-foundation.md` and `docs/ARCHITECTURE.md`'s "AI Core Foundation Architecture" section for the full design rationale. Summary:

- **Database**: 11 new models, 5 new enums (`AiProviderKind`, `AiMemoryStrategy`, `AiRoutingStrategy`, `AiCallOutcome`, `AiAuditAction`), 2 migrations (`20260731210717_add_ai_core_foundation`, `20260731211218_add_ai_model_audit_actions` — the second adding `MODEL_CREATED`/`MODEL_UPDATED`/`MODEL_DELETED` audit actions discovered while wiring the Model service). Zero changes to any pre-existing model; one additive back-relation on `User` (`aiAuditEvents`) and `McpServerConfig` (`aiBrainAllowances`).
- **`AiRoutingService`** is the real engine: Capability→Brain resolution, in-memory caching invalidated via a `AiAuditEvent`-driven `EventEmitter` (`ai-cache-invalidation.events.ts`), `{{placeholder}}` prompt templating, corrective-retry loop, per-Brain fallback, HTTP-status-based failure classification (4xx except 429 = definitive, everything else = transient — mirrors `eyan-automation-hub`'s Classify Ollama Result node), and confidence-tier classification against a parsed JSON response's `confidence` field. Fully unit-tested with dependency-injected fakes (no live provider or database needed).
- **Provider plugins**: `OllamaAiProvider` is a direct, unchanged-wire-contract generalization of the existing, already-verified `OllamaProvider`. `OpenAiAiProvider`/`AnthropicAiProvider`/`GeminiAiProvider` are new, thin, REST-only (`axios`, no new SDK dependency) translations of each provider's chat-completion API — structurally complete, typechecked, but not live-verified this session (no API keys available).
- **RBAC gap fix, bundled in as recommended by the TDD**: `frontend/src/features/roles/config/permissions.ts` previously omitted `finance`/`automation`/`automationcredentials` from the Roles UI's permission matrix even though the backend enforced them — fixed in the same pass as adding `aicore`/`aicoreadmin`.
- **Frontend**: 10 real, working pages (not stubs) — Dashboard, Capabilities (+ create dialog), Brains (+ create dialog), Providers (+ create dialog, health-check action, credential-add dialog), Models (+ create dialog), Playground (functional Capability/Brain invoke form with override controls, structured/raw output viewers, execution history), Usage, Costs, Health, Audit Logs. All read-flows and creation flows are real API calls, verified via a clean `vite build` and zero ESLint errors.

## Files Created / Modified

Backend — created (schema + migrations): `prisma/schema.prisma` (AI Core section appended), `prisma/migrations/20260731210717_add_ai_core_foundation/`, `prisma/migrations/20260731211218_add_ai_model_audit_actions/`.

Backend — created (providers): `src/providers/interfaces/ai-core-provider.ts`, `src/providers/ai-core-provider.factory.ts`, `src/providers/ai-core/{ollama,openai,anthropic,gemini}.ai-provider.ts`, `src/providers/register-ai-core-providers.ts`, `src/errors/ai-core-provider.error.ts`.

Backend — created (repositories): `src/repositories/ai-{capability,brain,provider,provider-credential,model,prompt,routing-policy,usage-log,audit-event,evaluation,brain-mcp-tool}.repository.ts` (+ `ai-provider.repository.test.ts`).

Backend — created (services): `src/services/ai-{capability,brain,routing,prompt,routing-policy,playground,provider,provider-health,usage,audit,evaluation,brain-mcp-tool}.service.ts`, `src/services/ai-cache-invalidation.events.ts` (+ `ai-routing.service.test.ts`, `ai-audit.service.test.ts`).

Backend — created (DTOs): `src/dto/ai-{provider,model,brain,capability,prompt,routing-policy,usage-log,audit-event,evaluation}.dto.ts` + matching `.mapper.ts` files.

Backend — created (validators): `src/validators/ai-{capability,brain,provider,model,prompt,routing-policy,playground,evaluation}.validator.ts`.

Backend — created (controllers): `src/controllers/ai-{capability,brain,prompt,routing-policy,provider,model,playground,usage,health,audit,evaluation}.controller.ts` (+ `ai-capability.controller.test.ts`).

Backend — created (routes): `src/routes/v1/ai-core-{capabilities,brains,providers,models,playground,usage,health,audit-logs}.routes.ts`.

Backend — modified: `src/app.ts` (route mounts + boot-time provider registration), `prisma/seed.ts` (`aicore`/`aicoreadmin` permissions).

Frontend — created: `features/ai-core/` (types, api, hooks × 8, lib/status-badges, schemas × 3, components × 14, index.ts barrel), `routes/app/_authenticated/ai-core/{,capabilities,brains,providers,models,playground,usage,costs,health,audit}/index.tsx` (10 route files).

Frontend — modified: `src/components/layout/data/sidebar-data.ts` (new "AI Core" group + icon imports), `src/features/roles/config/permissions.ts` (new "AI Core" category + the `automation`/`automationcredentials`/`finance` gap fix).

Docs — created: `docs/architecture/decisions/ADR-0021-ai-core-foundation.md`, this file.

Docs — modified: `docs/ARCHITECTURE.md` (new "AI Core Foundation Architecture" section), `PROJECT_STATE.md`, `CHANGELOG.md`.

## Database Changes

11 new tables, 5 new enums — see `docs/architecture/decisions/ADR-0021-ai-core-foundation.md`'s Decision section for the full model list and `docs/ARCHITECTURE.md` for the architecture-level summary. Full field-by-field detail lives in `prisma/schema.prisma`'s "AI Core Foundation (Phase 1)" section, which is the source of truth.

## API Endpoints

`/api/v1/ai-core/{capabilities,brains,providers,models,playground,usage,costs,health,audit-logs}` — see `docs/ARCHITECTURE.md`'s AI Core section and the route files under `backend/src/routes/v1/ai-core-*.routes.ts` for the full endpoint list and permission gates.

## Validation

- `npx tsc --noEmit` (backend): 0 errors.
- `npx tsc -b` (frontend): 0 errors.
- `npx vite build` (frontend): succeeds, `ai-core` chunk present, all 10 routes registered in the generated route tree.
- `npx eslint` on every new/modified frontend file: 0 errors.
- `npx vitest run` (backend, full suite): **799/799 passing** (26 new AI Core tests + all 773 pre-existing tests, zero regressions).
- Server boot (`tsx src/index.ts`): starts cleanly, AI Core provider registration logs no errors.
- `prisma migrate dev`: both migrations applied cleanly against the real development database; `aicore`/`aicoreadmin` permission rows confirmed present via direct query after `db:seed`.

## Known Issues / Follow-ups for a later sprint

- Hosted provider plugins (OpenAI/Anthropic/Gemini) are unverified against live APIs — no keys available this session.
- Deleting an `AiBrain` still referenced by an enabled `AiCapability` surfaces a raw Prisma foreign-key-constraint error rather than a friendly, mapped `ApiError` — the `Restrict` delete behavior itself is correct (per ADR-0021), only the error message needs mapping.
- No dedicated Brain-detail page (Prompt Library / Routing Policy tabs) in the frontend yet — those resources are managed via the API only this phase.
- Rate-limit **enforcement** is not built (only the reserved `AiProvider.rateLimitPerMinute` column exists, per ADR-0021's explicit Phase 1 scope).
- `AiEvaluationService`'s structural shape-check (`matchesShape`) is deliberately lightweight (top-level key presence only), not full JSON-schema validation — matches the TDD's own description of this field.

## Next Sprint (not started, requires separate approval)

Phase 2 — migrate `ChatController`, `ContentService`, `VideoWorkflowPlannerService`, and `VideoAssetService.generateText()` to AI Core Capabilities, one call site at a time, each independently reversible. See ADR-0021 and the TDD's Migration Plan (§18) for the intended sequencing.
