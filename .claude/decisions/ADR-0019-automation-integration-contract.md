# ADR-0019 — Automation Integration Contract

## Context

Sprint 2 ("Cross-System Skeleton") is the first sprint where EYAN AI Platform and `eyan-automation-hub` actually exchange HTTP calls. The TDD (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) already describes this contract narratively (§11 API Communication, §17 Security Model) — this ADR fixes it into concrete, implementable decisions before `authenticateService`, the service routes, or the outbound webhook dispatcher are written, per `docs/standards/IMPLEMENTATION_RULES.md`'s requirement that architectural contracts are settled before code.

**Scope note**: per this sprint's explicit direction, only the EYAN-side half of this contract is implemented now. `eyan-automation-hub` (the n8n side that verifies the webhook signature and calls these endpoints) is not touched this sprint — this ADR still specifies both sides of the contract, since a contract only one side has agreed to isn't a contract, but the "n8n verifies X" statements below describe what the *next* sprint's Automation Hub implementation must do to be compliant, not something built here.

## Decision 1: Webhook Authentication (EYAN → n8n)

- HMAC-SHA256 over `${timestamp}.${rawBody}` (not the body alone), using `AUTOMATION_WEBHOOK_SIGNING_SECRET` — a shared secret present in both repos' env.
- Sent as two headers: `X-Eyan-Signature: sha256=<hex-digest>` and `X-Eyan-Timestamp: <unix-ms>`.
- Signing the timestamp together with the body (rather than the body alone) is what lets the receiving side reject a replayed request even if the original signature+body pair leaks — n8n's future verification step checks the signature *and* that the timestamp is within a freshness window (5 minutes, matching TDD §17) before trusting the payload.
- EYAN's dispatch is fire-and-forget: a non-2xx response, timeout, or network failure is logged (`logger.error`) and never propagates back to the Lead Form's response or blocks lead creation (NFR: "lead-form response must return immediately").

## Decision 2: Service Authentication (n8n → EYAN)

- Static bearer token, `AUTOMATION_SERVICE_API_KEY`, checked via `Authorization: Bearer <token>` on every `/api/v1/crm/service/*` route.
- Compared with `crypto.timingSafeEqual`, not `===` — this is the one secret gating write access to every lead from what is, in practice, an internet-facing caller (no private network path between the two hosts), so a timing side-channel on the comparison itself is worth closing.
- Distinct from `AutomationConnection` (ADR-0012's per-user encrypted credential store for outbound MCP connections a person configures) — this is one system-level secret with no per-user identity, so it belongs in `env.ts` alongside `JWT_SECRET`, not the per-user credential table.
- No per-caller identity beyond "holds the shared secret" — a per-caller API-key table is explicitly deferred (see Deferred, below) until a second automation caller actually exists; building it now would be the exact "generic enterprise pattern solving an imaginary problem" the Phase 0.5 review warned against.
- **Fails closed, not open**: if `AUTOMATION_SERVICE_API_KEY` is unset, every `/crm/service/*` call is rejected (500, "Service authentication not configured") rather than silently authenticating every caller against an empty comparison value.

## Decision 3: Retry Policy

- Retries are n8n's responsibility end-to-end — `docs/standards/IMPLEMENTATION_RULES.md` already states this explicitly ("Automation Hub owns: Retry logic"), this decision just confirms EYAN's side has nothing to add.
- EYAN's outbound webhook dispatch performs **zero retries** of its own: one attempt, log-and-move-on on failure. The lead is already durably persisted in EYAN before the webhook fires, and Workflow 1 is independently re-triggerable against the same lead later (TDD §15) — a missed trigger is recoverable, so building retry/backoff into a fire-and-forget dispatch would duplicate logic that already lives, correctly, on n8n's side.
- EYAN's inbound `/crm/service/*` endpoints don't need to "support retries" beyond being idempotent (Decision 5) — a retried n8n call is just a repeated HTTP request against the same idempotent endpoint.

## Decision 4: Timeout Policy

- EYAN's outbound webhook dispatch: `AUTOMATION_WEBHOOK_TIMEOUT` (env, default `5000`ms). This call only needs to hand off a trigger, not wait for a result, so it's sized far shorter than an AI call (contrast Ollama's 300s chat timeout) — closer to "did the receiving server accept the connection."
- EYAN's inbound `/crm/service/*` routes: no new per-route timeout. These are synchronous DB writes (status transition, one `LeadAiAnalysis` insert), not long-running work, so the platform's existing default (no explicit route timeout anywhere in this codebase) is already correct and consistent with every other route — adding one here would be an isolated, unjustified exception.

## Decision 5: Idempotency Strategy

- Every `/crm/service/*` mutation requires the caller to supply the n8n execution's own identifier (`workflowExecutionId`) and `workflowName` in the request body — reusing `WorkflowExecutionLog.n8nExecutionId`, a field that already exists in the Sprint 1 schema, rather than introducing a new dedup table or a Redis-backed idempotency-key store.
- Before applying a mutation, the service layer looks up an existing `WorkflowExecutionLog` row for that `workflowName` + `n8nExecutionId`. If one already exists with `status = SUCCESS`, the call is treated as a successful replay: the current lead state is returned unchanged rather than the mutation being reapplied. This is an application-level check (query-then-write), not a database-level unique constraint — the same judgment call ADR-0018 Decision 3 already made for the status/activity write pair (no cross-repository transaction exists in this codebase yet, and a single sequential n8n caller doesn't create the write-write race a unique constraint would be defending against). Revisit only if a real duplicate-write incident is observed.
- Every successful mutation writes (or updates) exactly one `WorkflowExecutionLog` row for its `workflowExecutionId` — this is also how `docs/standards/IMPLEMENTATION_RULES.md`'s "every automated action creates WorkflowExecutionLog" rule is satisfied, not a separate telemetry call.

## Decision 6: Versioning Strategy

- URL path versioning already exists platform-wide (`/api/v1/...`); service routes inherit it (`/api/v1/crm/service/...`) — no new versioning scheme.
- The webhook payload and the service write-back payloads additionally carry their own `contractVersion` field (starting `"1"`), independent of the URL's `v1`. The URL version tracks the whole platform's REST API; `contractVersion` tracks only the shape of this specific cross-system JSON contract, which may need to evolve (e.g. new AI-analysis fields) on its own schedule.
- An unrecognized `contractVersion` is logged as a warning and processed best-effort rather than hard-rejected — consistent with the "never strand a lead" principle TDD §8 already established for AI failures.

## Alternatives Considered and Rejected

- **mTLS for service auth** — rejected: no certificate infrastructure exists in either repo; the stated perimeter (HTTPS + nginx, per TDD §17) plus a strong shared secret is proportionate to one trusted internal caller. mTLS would be new infrastructure defending against a threat (a compromised secret) not yet observed.
- **Short-lived JWT service tokens** (n8n mints a token before each call) — rejected: n8n has no user identity to authenticate as, and this would add a token-issuance round trip and a second secret to protect the first. A single static secret, rotated manually as a documented paired procedure (TDD §24), is simpler and matches how `AUTOMATION_ENCRYPTION_KEY` is already treated.
- **A dedicated idempotency-key store** (Redis or a new table) — rejected in favor of reusing `WorkflowExecutionLog.n8nExecutionId`, already in the schema and sufficient for a single caller; revisit only if a second automation domain needs cross-cutting idempotency infrastructure.
- **Synchronous request/response for the EYAN→n8n trigger** (EYAN waits for n8n to acknowledge before responding to the Lead Form) — rejected: violates the NFR that the Lead Form response must return immediately.
- **Requiring `AUTOMATION_SERVICE_API_KEY`/`AUTOMATION_WEBHOOK_SIGNING_SECRET` at boot via `requireEnv()`** (as the TDD's §11 narrative originally suggested, "same pattern as JWT_SECRET") — rejected on implementation: it would break every existing dev/CI/test environment that doesn't yet define these two brand-new secrets, including this repo's own 728-test backend suite. `AUTOMATION_ENCRYPTION_KEY` (Sprint 7.1, same Automation domain) already established the correct precedent for a feature-scoped secret — optional, empty-string default, fail-fast (closed, per Decision 2) only when a request actually needs it. This ADR follows that closer, more specific precedent instead of the TDD's more general one; nothing about the wire contract changes.

## Consequences

- `authenticateService` and the webhook-signing utility are the only two new pieces of cross-system security surface Sprint 2 introduces, and both are fully specified here before either is coded.
- A future automation domain (support, recruitment, invoicing) reusing `authenticateService`/`AUTOMATION_SERVICE_API_KEY` (per ADR-0018 Decision 6, TDD §7/§25) inherits this exact contract unchanged: same bearer-token check, same execution-ID idempotency pattern, same `contractVersion` field.
- If a second automation *caller* (not just a second domain still called by n8n) ever needs to exist, `AUTOMATION_SERVICE_API_KEY` becomes a table of scoped keys rather than one env var — explicitly deferred, matching TDD §25's "per-domain automation credential models... revisit only when a second automation domain exists."
- No Prisma migration is required by this ADR — every field this contract needs (`WorkflowExecutionLog.n8nExecutionId`/`workflowName`/`status`/`durationMs`/`errorMessage`, `LeadAiAnalysis`'s full field set) already exists from Sprint 1's schema-ahead-of-use design (ADR-0018 Decision 4).
