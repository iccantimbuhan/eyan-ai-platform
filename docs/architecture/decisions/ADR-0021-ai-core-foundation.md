# ADR-0021: AI Core Foundation

- Status: Accepted
- Date: 2026-08-01
- Authors: Claude Code

---

# Context

Sprints 1–3 built CRM Foundation and proved a real, working AI-orchestrated business capability end-to-end: lead intake → validation → AI qualification via `eyan-automation-hub` Workflow 3, with a fully specified provider/prompt/retry/confidence/error-handling contract (ADR-0020) and a live, verified integration against real Ollama (`eyan-automation-hub` ADR-0007). That work is not being discarded — it is the concrete, tested example this ADR generalizes from.

Two real, working systems independently reinvent the same shape:

1. Inside `eyan-ai-platform`, four services (`ChatController`, `VideoWorkflowPlannerService`, `ContentService`, `VideoAssetService.generateText()`) each construct `new ChatService()`, which calls a hardcoded `ProviderFactory.create()` → `OllamaProvider` — the literal embodiment of **ADR-0001 ("Single AI Provider, No Gateway")**. `VideoWorkflowPlannerService` already reinvented a corrective-retry loop that ADR-0020 separately cites as its own prior art — the same retry logic written twice, independently.
2. Inside `eyan-automation-hub`, Workflow 3 owns provider selection, prompt loading, retry, and confidence routing entirely in n8n nodes — correct and working, but n8n is a business-workflow layer and should not be the thing that knows Ollama's HTTP contract or retry counts.

ADR-0001 itself anticipated this moment: *"Adding a second provider or a gateway later remains possible without reversing this decision... it hasn't been needed yet and shouldn't be built speculatively ahead of that need."* CRM's Sales Brain (Phase 3, not yet built) is that need, now real. This ADR formally supersedes ADR-0001 for text/chat generation — not a silent override; ADR-0001 remains historically accurate about why a gateway wasn't built in Version 1.0, and this ADR records why one now is.

`ImageProviderFactory` is already a working provider registry (4 real providers) with nothing analogous for text/chat. AI Core generalizes that proven registry pattern to text.

# Decision

Build **AI Core** as a new platform module, architecturally MCP Foundation's sibling (ADR-0012's shape: registry + `CredentialManagerService` reuse + thin plugins + services owning all logic).

**Architecture (frozen — see Consequences for what requires a future ADR to change):**

```
Business Module / n8n Workflow → AiCapability → AiBrain → AiRoutingService → AiCoreProviderFactory → Provider Plugin
```

- **`AiCapability`** is the one thing a caller ever references by key — a business task ("lead-qualification"). It resolves to exactly one **`AiBrain`** — a reusable AI configuration (provider, model, prompt, routing policy, memory strategy). This two-level indirection was a mid-design correction: an earlier draft collapsed both into a single `AiBrain` entity, keyed by strings doing double duty as both business-task name and intelligence configuration. A Phase 0.5 architecture review (this engagement's established process — see the CRM Foundation TDD's own precedent) caught this: the original brief explicitly wanted a two-level "Capability → Brain" indirection so multiple Capabilities can share one Brain's provider/model identity with different prompts, and a Brain can be re-pointed without any Capability-level change. Retrofitting this after real Brains and callers existed in production would have meant a breaking migration on the one table every caller already depended on by key — cheaper to fix before Phase 1 implementation began.
- **Brain-direct invocation is administrative/Playground-only**, gated by a stricter `aicoreadmin` permission — never available to a business-module or (future, Phase 3) n8n service credential, which is scoped to `aicore` only.
- **`AiRoutingService`** is the only component that calls `AiCoreProviderFactory`. It owns retry (corrective, feeding the model its own bad output + the validation error on a schema failure — the exact pattern already proven twice: `VideoWorkflowPlannerService` and Workflow 3), a configured per-Brain fallback, and confidence classification. **Fallback is a deliberate, explicit revisit of ADR-0020 Decision 7** ("no automatic cross-provider failover"), not a silent contradiction: ADR-0020 rejected failover specifically because a result could become "attributable to a provider other than the one configured/expected" with no record of which provider actually produced it. `AiUsageLog` records exactly which provider/model produced the final result on every call, closing that attribution gap. Fallback remains per-Brain, explicitly configured — never a blind "try every registered provider" chain, preserving ADR-0020's other stated concern.
- **`AiCoreProviderFactory`** mirrors `McpConnectorFactory`'s registry shape (no env-var default) rather than `ImageProviderFactory`'s (which has one) — every routing call already knows its target provider from a resolved `AiRoutingPolicy`, so there is no scenario needing a global default.
- **Caching**: an in-process, in-memory cache of the resolved Capability→Brain→Policy→Prompt chain, invalidated by an `AiAuditEvent`-driven event (not a TTL) — no Redis, no distributed cache, matching the current single-backend-instance deployment. A full cache clear on any invalidating event, not per-key eviction — a deliberate simplification, correct and cheap enough at Phase 1's traffic that partial invalidation would be premature optimization.
- **AI Playground** (restored after being dropped from an early draft — a second Phase 0.5 finding) is the engineering validation environment: execute a Capability or Brain with one-off provider/model/prompt overrides, never persisted, never cached, and never counted in production usage/cost reporting — every Playground call is domain-tagged `"ai-core-playground"` on the same `AiUsageLog` table (no duplicate logging system).
- **`AiProviderHealthService`** (a third Phase 0.5 finding) mirrors `McpHealthService`'s actual behavior — the original draft cited it as precedent without a service that ever populated `AiProvider.healthStatus`.
- **Naming**: "Capability" always means a business task; "tag" (`AiModel.tags`, `AiRoutingPolicy.requiredTag`) always means a model's technical ability (a fourth Phase 0.5 finding — the original draft's `AiModel.capabilities` field collided with the new `AiCapability` entity's own name).
- `AiProvider.rateLimitPerMinute` — reserved, unenforced in Phase 1 (a fifth Phase 0.5 finding: rate limiting was named in the original brief's scope and silently absent from the first draft).

**Migration is purely additive.** Phase 1 (this ADR's scope) changes zero existing call sites — `ChatService`, `ContentService`, `VideoWorkflowPlannerService`, `VideoAssetService`, and `eyan-automation-hub` Workflow 3 all continue exactly as built. Phase 2 (migrating those call sites to Capabilities, one at a time, independently reversible) and Phase 3 (re-pointing Workflow 3 at `POST /ai-core/capabilities/lead-qualification/invoke`) are named, sequenced, and require their own separate approval before starting — not implied by this ADR.

# Alternatives Considered

**Keep the single-Brain design (no separate Capability entity).** Rejected at Phase 0.5 review — see above; the two-level indirection is cheap now and expensive to retrofit once real Brains and callers exist.

**Give `AiCoreProviderFactory` an env-var default, mirroring `ImageProviderFactory`.** Rejected — every real caller already resolves an explicit provider key from a `AiRoutingPolicy` row; a global default would be dead configuration with no code path that reads it, the same reasoning `McpConnectorFactory` already used to reject a default (many providers are meant to coexist, not one "the" provider).

**Build real vector/RAG memory now that `AiBrain.memoryStrategy` exists.** Rejected — `ChatService` has zero conversation persistence today (confirmed by direct code search); building a memory subsystem ahead of a Brain that needs it would repeat the exact mistake this codebase's own ADRs have repeatedly and explicitly declined to make (e.g. `PromptTemplate` existing unwired). The enum value is reserved; the implementation is Phase 4+.

**Add a separate `AiCostRecord`/budget-ledger table.** Rejected — cost aggregation is a query over `AiUsageLog`, not a second written ledger; avoids dual-writing derived data, the same reasoning `AnalyticsEvent` already applies platform-wide.

# Consequences

- **Frozen — requires a future ADR to change**: AI Core is a sibling of MCP Foundation, not a merger into it. Business modules invoke Capabilities only; Capabilities resolve Brains; Brains resolve Routing Policies; Routing Policies resolve Providers/Models/Prompts. Provider plugins remain thin (no retry/fallback/persistence logic inside a plugin). Prompt and Routing Policy versions remain additive-only. `CredentialManagerService` remains the single credential system platform-wide. Provider fallback remains Brain-configurable only, never a blind chain. Existing call sites remain untouched until Phase 2; Workflow 3's re-pointing remains Phase 3, requiring its own approval.
- **Known limitation, acceptable for Phase 1**: no Brain-to-Brain composition exists (a prerequisite for real multi-agent orchestration). Capability→Brain resolution solves task-to-Brain lookup only; when Phase 4 planning begins, Brain-to-Brain composition should be treated as a genuinely new design question, not an extension of this one.
- **Known limitation, acceptable for Phase 1**: deleting an `AiBrain` that still backs an enabled `AiCapability` fails at the database level (Prisma's default `Restrict` on delete) rather than with a friendly, mapped API error — a real, if minor, gap flagged for a later pass rather than a blocking issue for this sprint.
- Hosted providers (OpenAI, Anthropic, Gemini) are implemented as thin REST plugins (no new SDK dependency) and are structurally complete but not live-tested against real API keys this sprint — only Ollama was exercised against a real, reachable endpoint. This mirrors Sprint 3's own honest reporting posture (real findings over manufactured success).

# Related Documents

- `docs/architecture/decisions/ADR-0001-single-ai-provider-no-gateway.md` (superseded for text/chat generation by this ADR)
- `docs/architecture/decisions/ADR-0012-mcp-foundation.md` (the architectural shape this module mirrors)
- `docs/architecture/decisions/ADR-0020-ai-provider-contract.md` (Decisions 2, 5, 6, 7, 8 generalized here)
- `docs/architecture/decisions/ADR-0018-crm-foundation.md`, `docs/architecture/decisions/ADR-0019-automation-integration-contract.md` (the CRM/automation context this module generalizes from)
- `/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md` (full Technical Design Document, Phase 0.5 Architecture Review, and Architecture Freeze report)
- `docs/ARCHITECTURE.md` — "AI Core Foundation Architecture" section
- `tasks/completed/sprint-ai-core-phase1.md` — full Phase 1 implementation log
