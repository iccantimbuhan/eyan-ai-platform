# ADR-0020 — AI Provider Contract

## Context

Sprint 3 will implement real AI qualification (n8n Workflow 3), replacing the dummy/stub payload Sprint 2's `PATCH /crm/service/leads/:id/qualification` endpoint has been exercised with since it was built. Before that implementation begins, this ADR fixes the contract it must follow — provider abstraction, prompt versioning, the JSON schema, timeout/retry/confidence/fallback policy, and error handling — largely by freezing decisions the TDD (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) already made narratively (§12 AI Strategy, §13 Prompt Strategy, §14 AI JSON Schema) into concrete, implementable rules, and closing the gaps the TDD left open (fallback policy, error-class handling).

**This sprint (per its own explicit brief) implements none of the AI work this ADR describes** — no Ollama, OpenAI, Gemini, or Claude call, no Workflow 3. This ADR exists so the next sprint has a settled contract to build against, the same sequencing ADR-0019 used for the service/webhook contract before Sprint 2 built it.

## Decision 1: Provider Abstraction

n8n Workflow 3 selects the AI provider via a Switch/Router node keyed off a config value (`AI_PROVIDER`, default `ollama`), never a hardcoded HTTP call — matching TDD §12 exactly. Every provider branch converges on the same JSON-schema validation step (Decision 3) before continuing; no downstream node (or EYAN endpoint) ever needs to know which provider ran — `LeadAiAnalysis.provider`/`.model` record it per-row for audit, not for branching logic elsewhere. Ollama needs no n8n credential (a local network call to the same host); OpenAI/Gemini/Claude each get their own credential in n8n's native, encrypted credential store — never a shared code path assuming one vendor's request/response shape.

## Decision 2: Prompt Versioning

One versioned prompt template file, not per-provider prompts — `eyan-automation-hub/workflows/crm/prompts/lead-qualification.v1.md`, parameterized with lead fields, instructing the model to return only the JSON object (Decision 3) with no prose outside it. `LeadAiAnalysis.promptVersion` (already in the Sprint 1 schema) records which version produced a given result. A prompt change that alters output shape or intent is a new file (`.v2.md`, ...), never an in-place edit once a version has produced production results — preserves the ability to explain why an older lead's analysis reads differently from a newer one.

## Decision 3: JSON Schema Contract

Reuses the TDD §14 schema verbatim — no new fields introduced by this ADR:

```json
{
  "leadScore": 0-100, "confidence": 0.0-1.0,
  "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT",
  "industry": "string", "companySizeEstimate": "string",
  "budgetEstimate": { "min": number, "max": number, "currency": "string" } | null,
  "buyingIntent": "LOW"|"MEDIUM"|"HIGH", "urgency": "LOW"|"MEDIUM"|"HIGH",
  "decisionMakerIdentified": boolean,
  "estimatedTimeline": "IMMEDIATE"|"SHORT_TERM"|"MEDIUM_TERM"|"LONG_TERM"|"UNKNOWN",
  "riskLevel": "LOW"|"MEDIUM"|"HIGH",
  "painPoints": ["string", ...], "recommendedAction": "string",
  "summary": "string", "reasoning": "string"
}
```

A schema-validation step in Workflow 3 is the real enforcement mechanism, not prompt wording alone — models are not fully reliable at obeying "JSON only" (TDD §13). n8n wraps the validated model output with execution metadata (`provider`, `model`, `promptVersion`, `latencyMs`, `needsManualReview`) before calling `PATCH /crm/service/leads/:id/qualification` — the exact same endpoint, and the exact same wrapped shape, Sprint 2 already built and exercised end-to-end with a dummy payload. Sprint 3 changes what produces the payload, never the contract receiving it.

## Decision 4: Timeout Policy

Distinct from ADR-0019's 5s webhook-dispatch timeout (EYAN's outbound trigger call to n8n — unrelated to the AI call n8n itself makes). Per-provider HTTP timeout on the AI call:
- **Ollama**: a generous timeout matching EYAN's own existing 300s Ollama chat precedent (`OllamaProvider`'s `REQUEST_TIMEOUT_MS`) — same CPU-only host, same cold-model-load risk after an idle period.
- **OpenAI/Gemini/Claude**: 60s — typical hosted-API round-trip budget, no cold-load concern.

A timed-out call is handled identically to a schema-invalid result (Decision 5/8) — it is a transient failure, not a distinct code path.

## Decision 5: Retry Policy

Up to 3 retries on invalid/malformed JSON or a transient failure (timeout, 5xx, connection error) — matches TDD §10 Workflow 3's stated retry count. Each schema-validation-failure retry feeds the model its own bad output plus the specific validation error, the same corrective-retry shape already proven in EYAN's `VideoWorkflowPlannerService.plan()` (one retry there; 3 here, since this AI step has no synchronous request/response caller waiting on it the way a planner API call does). Retries do **not** apply to a definitive provider error (Decision 8, class 3) — retrying an invalid credential wastes the retry budget on a failure retries cannot fix.

## Decision 6: Confidence Policy

Reuses the TDD §12 three-tier system verbatim — no change:
- **High** (`confidence ≥ 0.75`): fully automated, normal CRM Update + Notifications flow.
- **Medium** (`0.4 ≤ confidence < 0.75`): still automated (never blocks the pipeline), write-back annotated "AI-assisted, review recommended."
- **Low** (`confidence < 0.4`) or exhausted retries: `needsManualReview = true`, routes to the Human Review Queue instead of standard notification fan-out.

Thresholds are Workflow 3 config values, not hardcoded — matches the existing notification-priority-threshold pattern (TDD §20).

## Decision 7: Fallback Policy

**No automatic cross-provider failover in v1.** If the configured primary provider (`AI_PROVIDER`, Decision 1) fails after exhausting its own retries, the lead lands in `needsManualReview = true` via the same qualification write-back Sprint 2 already built — it does not silently retry against a second provider. OpenAI/Gemini/Claude are "alternates" in the sense of being swappable via the `AI_PROVIDER` config value (an operator deliberately switches the primary), not an automatic runtime failover chain.

**Alternative considered and rejected**: automatic failover to a secondary provider on primary-provider exhaustion. Rejected — it would produce a qualification result attributable to a provider other than the one configured/expected, complicating the audit trail (`LeadAiAnalysis.provider` is recorded per-row, with no separate "attempted providers" list), and there is no evidence yet that the primary provider fails often enough to justify the added complexity. This is exactly the kind of "generic enterprise pattern solving an imaginary problem" the Phase 0.5 architecture review's own guardrail warned against. If real operational data later shows Ollama failing often enough to matter, the design to add is an explicit, config-driven ordered fallback list — not built now.

## Decision 8: Error Handling

Three failure classes, each with a different, deliberately distinct outcome:

1. **Schema-invalid output** (malformed JSON, missing required field) → retry (Decision 5) → `needsManualReview = true` on exhaustion.
2. **Transient failure** (timeout, 5xx, connection refused) → retry (Decision 5) → `needsManualReview = true` on exhaustion.
3. **Definitive failure** (401/403 invalid credential, 400 bad request rejected by the provider itself) → fails immediately, no retry — surfaces as a `WorkflowExecutionLog(status: FAILED, errorMessage)` row (the `durationMs`/`errorMessage` fields already exist for exactly this, from Sprint 1's schema), and the lead still lands in `needsManualReview = true` rather than being left stuck at `VALIDATED`.

Every failure of any class still produces a `WorkflowExecutionLog` row and a `needsManualReview` lead — "never strand a lead" (TDD §8) applies uniformly across all three classes, not just the happy-path-adjacent ones. No new EYAN-side endpoint is required for Sprint 3 to report any of these — the same `PATCH .../qualification` contract Sprint 2 built already carries `errorMessage`/`needsManualReview`.

## Consequences

- Sprint 3 has a fully specified contract to implement against — provider selection, prompt file location/versioning, exact JSON shape, timeout/retry counts, confidence thresholds, fallback behavior, and error-class handling are all fixed here, not decided ad hoc during implementation.
- No EYAN-side change is required by this ADR — every field and endpoint Sprint 3 will call already exists from Sprint 1 (schema) and Sprint 2 (`/crm/service/*` contract, ADR-0019).
- Adding a second/third hosted provider later (Decision 1) is additive — a new Switch branch plus a new n8n credential, no change to the schema, the write-back endpoint, or the confidence/fallback policy.
- If Ollama's real failure rate under production load later justifies automatic failover, Decision 7 is the one decision in this ADR expected to be revisited — explicitly flagged rather than silently designed around now.
