# ADR-0024 — Finance Automation Service Contract

## Context

The AI Finance Inbox (an n8n-based, intent-routed automation workflow living in the companion repo `eyan-automation-hub`, first channel Slack) needs to write and read Finance data without ever holding a user's JWT or being trusted with `requirePermission("finance")` scope — it is a service caller, not a person. The existing Finance REST API (`finance-expenses.routes.ts`, `finance-budget.routes.ts`, `finance-dashboard.routes.ts`) is gated exclusively by `authenticate` + `requirePermission("finance")`, the same as every other user-facing route. No service-to-service surface exists for Finance, unlike CRM's `/api/v1/crm/service/*` (ADR-0019).

This ADR does not invent a new contract — ADR-0019 already anticipated this moment: *"A future automation domain (support, recruitment, invoicing) reusing `authenticateService`/`AUTOMATION_SERVICE_API_KEY` inherits this exact contract unchanged: same bearer-token check, same execution-ID idempotency pattern, same `contractVersion` field."* This ADR is the record of that inheritance actually happening for Finance, plus the handful of Finance-specific decisions (which endpoints, what payload shape, how idempotency maps onto `Expense` writes) that ADR-0019 correctly left to whichever domain adopts it.

**Scope note**: this ADR covers Phase 1 of the approved AI Finance Inbox implementation plan — the backend service surface only. The n8n workflow side (front door, orchestrator, intent handlers) is a separate, later phase in `eyan-automation-hub` and is not built here.

## Decision 1: Reuse `authenticateService` / `AUTOMATION_SERVICE_API_KEY` Unchanged

- `/api/v1/finance/service/*` is gated by the existing `authenticateService` middleware (`src/middleware/service-auth.middleware.ts`) — the same static bearer token, the same `crypto.timingSafeEqual` comparison, the same fail-closed behavior on a missing key. No new secret, no new middleware, no code change to `service-auth.middleware.ts` itself.
- This is deliberate, not an oversight: ADR-0019 Decision 2 already rejected per-caller API keys until a second automation *caller* (not just a second domain) exists. Finance is a second *domain* called by the same n8n instance, not a second caller — the existing single shared secret is still the correct model.

## Decision 2: Endpoint Surface (Phase 1)

Three routes, mounted at `/api/v1/finance/service/*`:

- `POST /expenses` — creates an `Expense` via the existing `FinanceExpenseService.create()`, unchanged. Backs both the `CREATE_EXPENSE` and `UPLOAD_RECEIPT` intents in the AI Finance Inbox plan (a receipt, once its fields are extracted, is written the same way an expense is).
- `GET /categories` — a read-only surface exposing the same `ExpenseCategory`/`PaymentMethod` enums (`generated/prisma/enums.js`) every other Finance route already validates against. Not a new source of truth; lets n8n's intent-classification/handler workflows fetch real values instead of hardcoding a copy that can drift.
- `GET /dashboard` — delegates to the existing `FinanceDashboardService.getDashboard()` unchanged, which already includes budget, remaining budget, category breakdown, and spending trend — sufficient for `GET_DASHBOARD` and `GET_FINANCE_QUESTION` handlers without a separate budget-only endpoint in this phase.

A dedicated `GET /budget` route, and any route for `income`/`transfer` (which have no backing Prisma model at all — verified against `schema.prisma`), are explicitly **not** built in this phase. They are deferred to whichever later phase actually needs them, consistent with this platform's standing preference for building the endpoint a real caller needs now rather than a complete surface speculatively.

## Decision 3: Layering — No Parallel Write Path

- `FinanceAutomationController` → `FinanceAutomationService` → the **existing** `FinanceExpenseService` / `FinanceDashboardService` (which in turn own their existing repositories). `FinanceAutomationService` never imports a repository or Prisma directly.
- This mirrors `CrmAutomationIngestService`'s relationship to `CrmLeadService`'s underlying repositories, but goes one step further: CRM's automation service re-implements lead-transition logic inline (with `ALLOWED_TRANSITIONS` imported to avoid a second copy of the state machine); Finance's automation service has no business logic to re-implement at all — `FinanceExpenseService.create()` already does everything (Decimal handling, recurring-template creation, audit events) a human-facing create needs, so the automation service is a pure pass-through plus the automation-specific idempotency wrapper (Decision 5). This is the concrete mechanism by which "all business logic stays in the Finance module" holds structurally, not just by convention.

## Decision 4: Provenance via `createdBy`, Not a New Column

- `Expense.createdBy` is a plain nullable audit string (no `User` FK), the same posture as `VideoAsset.createdBy` / `GeneratedContent.createdBy` elsewhere in this schema. `CrmAutomationIngestService` passes `actorId: null` for every automated `LeadActivity` it writes, since CRM's automated actions have no better identity to offer.
- Finance can do better without a schema change: `FinanceAutomationService.createExpense()` builds `createdBy` as `"<source.channel>:<source.externalUserId>"` (e.g. `"slack:U012ABC"`) from the caller-supplied `source` envelope. This is a real audit improvement over CRM's `null`, available specifically because the AI Finance Inbox's channel-agnostic `source` field (required on every mutation, validated by `finance-automation.validator.ts`) always carries a real external identity.

## Decision 5: Idempotency Strategy — Inherited, With One Known Gap

- Reuses `WorkflowExecutionLog` exactly as `CrmAutomationIngestService` does: before applying `POST /expenses`, look up an existing row for the given `workflowName` + `workflowExecutionId`; if one exists with `status = SUCCESS`, treat the call as a safe replay rather than re-applying the write. `domain: "finance"` requires no migration — the column is a plain `String @default("crm")`, already documented in the schema as intended for multi-domain reuse.
- **Known gap, accepted for this phase**: `WorkflowExecutionLog` has no `expenseId` column, so a replay can confirm the original write already succeeded but cannot re-return the created `Expense`. `FinanceAutomationController.createExpense` returns `{ replayed: true, workflowExecutionId }` in that case rather than the full expense payload. This is acceptable because a genuine replay only happens when the *caller* lost the original response (e.g. a client-side timeout after the server had already committed) — not on every retry, since 4xx responses are never retried by n8n's stated retry policy and a successful response is never retried at all. A nullable `Expense.id` traceability column on `WorkflowExecutionLog` (mirroring the existing nullable `leadId`) would close this gap; deferred until a real incident (not just a theoretical one) demonstrates it's needed, matching this ADR series' standing practice of not building idempotency infrastructure ahead of an observed problem (see ADR-0019's own "Alternatives Considered" on this exact point).

## Decision 6: Validation and Versioning — Inherited Unchanged

- `contractVersion`, `workflowExecutionId`, `workflowName` are required on `POST /expenses`, exactly matching ADR-0019 Decisions 5 & 6. URL path versioning (`/api/v1/...`) is unchanged; no new versioning scheme introduced.
- Field-level validation (`amount.isFloat({min:0.01})`, `category.isIn(EXPENSE_CATEGORIES)`, `date.isISO8601()`) is copied from `finance-expense.validator.ts`'s existing `createExpenseValidator`, not re-derived — same rules, same messages, applied via a new `finance-automation.validator.ts` file (kept separate from the JWT-path validator file because the two validate different route surfaces, matching how `crm-automation.validator.ts` and the user-facing CRM validators are already kept separate).

## Alternatives Considered and Rejected

- **A new per-domain service secret** — rejected for the same reason ADR-0019 Decision 2 rejected it originally: one caller (n8n), one secret, until a second caller (not domain) exists.
- **Reusing the user-facing `/finance/expenses`/`/finance/dashboard` routes with a service-token bypass inside `authenticate`** — rejected: would blur two structurally different auth paths (`authenticate` vs `authenticateService`) into one middleware with conditional behavior, exactly what `.context/crm.md`'s "n8n-facing routes are gated by `authenticateService`, separate from the user-facing JWT auth path" already establishes as the wrong shape.
- **A dedicated `expenseId` column on `WorkflowExecutionLog` now** — deferred, not rejected outright; see Decision 5. Not built in this phase because no real replay-payload-loss incident has been observed yet, and it's a low-risk, backward-compatible addition to make later.
- **Building `GET /budget`, or `income`/`transfer` routes, in this phase** — rejected as premature: no caller needs `/budget` yet (`/dashboard` already carries budget/remaining-budget data), and `income`/`transfer` have no backing Prisma model at all — building routes with nothing behind them would be exactly the kind of speculative surface this platform's standards documents warn against.

## Consequences

- `FinanceAutomationController`, `FinanceAutomationService`, `finance-automation.dto.ts`, and `finance-automation.validator.ts` are the only new backend surface this phase introduces, all fully specified here before being reviewed.
- No Prisma migration is required — every field this contract needs already exists (`WorkflowExecutionLog.domain`/`workflowName`/`n8nExecutionId`/`status`, `Expense.createdBy`).
- The `finance_question` and any future `income`/`transfer` handling in the n8n workflow (a later phase, not this one) will need either `/finance/service/budget` added or a genuine new Finance sub-feature (Income/Transfer models) respectively — both explicitly out of scope here and each its own future decision, not something this ADR pre-approves.
- `.context/finance.md` is updated alongside this ADR with the one new rule this contract introduces (channel-derived `createdBy` provenance).
