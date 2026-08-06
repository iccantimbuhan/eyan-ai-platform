# ADR-0032 — Daily Closing as the Core Operational Workflow

**Status: Proposed — not implemented in Sprint 0.** Sprint 0 is tenancy foundation only (Organization/Restaurant/Branch, membership, authorization, Module Registry, nav, a placeholder dashboard). This ADR records the intended design for Daily Closing ahead of Sprint 4, per the approved architecture package, so the schema/service shape is settled before that work starts.

## Context

Daily Closing is the platform's central workflow — it aggregates sales, expenses, inventory counts, and purchase reconciliation into one cash-reconciled, lockable record per Branch per date. It must feel deliberately sequenced, not like another CRUD form, but the codebase has zero workflow/scheduler infrastructure today (Finance's recurring-expense generation is explicitly lazy-on-read for exactly this reason — ADR-0013), and the platform's own engineering principles ("avoid unnecessary abstractions," "no Kafka/RabbitMQ or unnecessary infrastructure") rule out adopting a general-purpose workflow-engine product.

## Decision

Model Daily Closing as an explicit state machine owned by one orchestrating service (`RestaurantDailyClosingService`), not as a dependency on Temporal, Camunda, or similar.

- `DailyClosing.status`: `DRAFT → IN_PROGRESS → COMPLETED` (+ `REOPENED`, an audited admin override back to `IN_PROGRESS`).
- A child table `DailyClosingStep` tracks each required step independently: `SALES_IMPORTED`, `EXPENSES_RECORDED`, `INVENTORY_COUNTED`, `PURCHASES_RECONCILED`, `CASH_RECONCILED` — each with its own completed-by/at.
- `complete()` is a single service method that validates every required step is done, computes variance, persists `COMPLETED`, and is the sole place a `DailyClosingCompleted` domain event is recorded.
- The orchestrator *calls* existing Branch-scoped services (Inventory, Expense, Purchase, Ingestion) — it does not duplicate their logic, and they remain independently usable outside a closing (e.g. recording an expense mid-day doesn't require an open closing).

## Consequences

Positive:
- No new runtime dependency; fully explicit and unit-testable; consistent with the platform's existing "lazy/explicit over scheduled" posture.

Negative:
- The state machine is hand-rolled, not framework-backed — acceptable at this module count. Reconsider only if a second module independently needs the same multi-step-workflow shape; that would be a real trigger for extracting a shared `WorkflowStep` primitive, not built preemptively here.

## Alternatives Considered

1. Temporal/Camunda or a similar workflow-engine product — rejected, infrastructure the platform explicitly avoids at this scale and inconsistent with its zero-scheduler reality today.
2. A single `status` enum with no step table — rejected, loses the "which step is blocking completion" UX the manager's actual workflow needs.
3. A generic in-house workflow-engine abstraction shared across future modules from day one — rejected as premature; build it Restaurant-specific first, extract only if a second consumer genuinely appears.
