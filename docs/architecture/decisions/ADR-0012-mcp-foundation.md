# ADR-0012 — MCP Foundation: Registry Pattern, Credential Isolation, Service-Owned Business Logic

## Context

Sprint 7.1 introduces the MCP Foundation — the reusable integration layer future automation providers (Canva, CapCut, GitHub, Docker, Filesystem, Google Drive, Slack, Discord, Notion, PostgreSQL, Redis, n8n) will register into. This sprint deliberately implements **no real provider** — only the registry, the credential/connection lifecycle, health checking, audit logging, the REST API, and a management UI, proven end-to-end against one deterministic `FakeMcpConnector`. Several decisions made across Milestones 2–6 are recorded here so future provider sprints (starting with Sprint 7.2, Canva) integrate the same way rather than each inventing its own pattern.

## Decision 1: Provider registration reuses `ImageProviderFactory`'s registry shape, not a new pattern

`McpConnectorFactory` (`backend/src/providers/mcp-connector.factory.ts`) is a `Map`-based registry with `register()`/`create()`/`listRegistered()`/`reset()` — structurally identical to `ImageProviderFactory` and `PlatformProviderFactory`. This repo already has two working precedents for "many interchangeable implementations of one capability, added later with zero changes to callers"; a third, novel pattern for MCP would only fragment the codebase's own conventions for no benefit.

One deliberate difference from `ImageProviderFactory`: `McpConnectorFactory.create()` has **no env-var default**, mirroring `PlatformProviderFactory` instead. `ImageProviderFactory.create()` defaults to `env.imageProvider` because there is meaningfully one "current" image provider a request can omit. MCP servers are the opposite — many `McpServerConfig` rows are expected to exist and run simultaneously, each explicitly naming its own provider, so there is no single "the" MCP provider a call could reasonably default to. This is the same reasoning ADR-0010 already gave for `PlatformProviderFactory`.

**Alternative considered and rejected**: a single-provider switch like `ProviderFactory` (ADR-0001's Chat/`AIProvider` pattern). Rejected immediately — ADR-0001's single-provider decision was a hardware-capacity constraint specific to interactive Chat's concurrent-model-load requirement. MCP connectors are not concurrent model workloads; multiple can be registered and even connected without implying multiple models running under load. Applying ADR-0001's constraint here would conflate two unrelated concerns.

## Decision 2: Connectors never decrypt credentials — `CredentialManagerService` is the only thing that touches the key

`McpConnector.connect(config: McpConnectorConfig)` receives `config.credentials` as an already-decrypted plain object. No `McpConnector` implementation (including all future real ones) imports `utils/encryption.ts`, reads `AUTOMATION_ENCRYPTION_KEY`, or touches `AutomationConnection.encryptedCredentials`/`credentialsIv` directly. `CredentialManagerService` is structurally the only caller of the encryption util in the entire codebase.

This matters for two reasons. First, it means a future real connector (Canva, GitHub, Slack) is reviewable for correctness without also having to be reviewed for cryptographic correctness — that concern is fully centralized and already tested (Milestone 4: 12 dedicated encryption tests covering wrong-key and tampered-ciphertext failure modes). Second, it makes secret rotation (`CredentialManagerService.rotate()`) transparent to every connector — rotating a credential never requires touching connector code, because a connector never held a reference to the ciphertext to begin with.

**Alternative considered and rejected**: let each connector decrypt its own credential on demand (e.g. by injecting `CredentialManagerService` into every connector). Rejected — it would mean 12+ future provider classes each need to correctly call the decrypt path, multiplying the surface area for a mistake (e.g. logging a decrypted credential, or caching it longer than a single `connect()` call) instead of confining that risk to one file.

## Decision 3: Business logic stays in services; controllers and connectors stay thin

Every mutation-with-consequences (encrypting a credential, checking ownership, writing an audit event, evaluating connector health, persisting a health result) happens in a service — `CredentialManagerService`, `AutomationConnectionService`, `McpServerConfigService`, `McpHealthService`, `AutomationAuditService` — never in a controller (which only extracts `req`/calls one service method/maps the response) and never in a connector (which only implements `connect`/`listTools`/`callTool`/`disconnect`/`healthCheck` against whatever it's actually integrating with). This is not a new decision for this sprint — it is `.context/backend.md`'s Routes→Controllers→Services→Repositories→Prisma chain applied to a new domain — but it is recorded here because two points needed active enforcement during implementation, not just inherited by convention:

- `McpHealthService` orchestrates a connector's `connect()`→`healthCheck()`→`disconnect()` lifecycle and decides what to persist; the connector itself never writes to the database. This mirrors `ImageService` owning persistence while `ImageProvider` only ever returns bytes.
- Audit logging is centralized behind `AutomationAuditService.record()` — every other service calls this one method rather than importing `AutomationAuditEventRepository` directly, so "what counts as a valid audit event" has one implementation, not four slightly-different ones.

## Decision 4: The frontend contains no business logic

`features/automation`'s API client (`automation-api.ts`) is a thin 1:1 mapping to Milestone 5 endpoints; its hooks (`use-connections.ts`, `use-mcp-servers.ts`, `use-audit-logs.ts`) are React Query wrappers with no logic beyond cache-key management and toast messages. Concretely:

- Credentials are sent to the backend as plaintext JSON over HTTPS and encrypted server-side — the frontend never computes, stores, or displays a ciphertext, and never re-implements the "is this a valid credential" check beyond the minimal "is this valid, non-empty JSON" client-side validation needed for a usable form error (the same non-empty-object rule the backend's `credentialsValidator`/`CredentialManagerService.validatePayload()` already enforce, duplicated only as a UX nicety, not as the actual authority — the backend still validates and would reject an insufficient payload even if a client bypassed the form).
- Permission gating (`useCan('automation')`, `useCan('automationcredentials')`, `useCan('auditlogs')`) mirrors the backend's actual `requirePermission()` calls exactly, route-for-route — it is a UI convenience (hide controls the user can't use) never a security boundary; every mutation is re-checked server-side regardless of what the UI shows.
- The Health page reuses the same `useMcpServers()` query the MCP Servers page uses rather than fetching or deriving health status independently, since `McpServerConfig` already carries its own health fields.

**Alternative considered and rejected**: give the frontend a richer, provider-aware credential form (e.g. per-provider field schemas). Rejected for this sprint — no real provider exists yet to design a schema against, and building one now would be speculative UI ahead of the need `.context/coding-rules.md` warns against. The generic JSON textarea is an honest reflection of the backend's actual, deliberately provider-agnostic `Record<string, unknown>` contract.

## How a future real provider should integrate

1. Add `providers/mcp/<provider>-mcp.connector.ts` implementing `McpConnector` (`connect`/`listTools`/`callTool`/`disconnect`/`healthCheck`).
2. Register it in `register-mcp-connectors.ts` — one line, no changes to `McpConnectorFactory`, any service, any route, or any validator.
3. If the provider needs OAuth or an API key, that credential is created through the existing `POST /automation/connections` (or a future OAuth authorize/callback pair, out of scope until a provider actually needs it) and referenced by `McpServerConfig.connectionId` — never a new, provider-specific credential store.
4. If the provider is also meant to be a first-class product feature (the way Canva is expected to be, per the Sprint 7 architecture review), it should additionally get its own `<Provider>Provider` implementing a dedicated interface (e.g. `DesignProvider`) — the MCP connector then becomes a thin adapter calling that provider's own methods, never a second implementation of the same capability. This mirrors how `ImageProvider`/`PlatformProvider` are the source of truth today and nothing duplicates their logic elsewhere.
5. No schema change is required for a new *connector* — `McpServerConfig.provider` is a plain string, not an enum, specifically so the registry (not the schema) is the source of truth for which providers exist.

## Consequences

- Adding a 2nd, 3rd, ... 14th MCP connector is additive: one class, one `register()` call, zero changes to `McpConnectorFactory`, `McpHealthService`, `McpServerConfigService`, the routes, the validators, or the frontend.
- `AutomationConnection` remains the single credential store for every future integration — OAuth-based providers add authorize/callback routes later without changing where or how the credential itself is stored or decrypted.
- `AutomationAuditAction`'s enum will need additive new values as real providers arrive (e.g. a future `WORKFLOW_EXECUTED` when n8n integration begins) — the same posture `ReviewEventType`/`AnalyticsEventType` already have (ADR-0009/0011): grow the enum, never repurpose an existing value's meaning.
- This sprint intentionally proves the foundation with a fake connector rather than a real one first — the same sequencing `ImageProviderFactory` used before Sprint 4.2's first real image provider (`FakeImageProvider` existed and was fully tested first) — so Sprint 7.2 (Canva) is "register a real class," not "also debug the registry."
