# Finance

Single responsibility: the Finance (household expense/budget) module — file locations and rules unique to this domain.

## Files
- Backend: `backend/src/{controllers,services,repositories}/finance-*`
- Frontend: `frontend/src/features/finance`

## Rules
- Money (`Expense.amount`, `Budget.monthlyLimit`) is `Prisma.Decimal`, converted to a fixed-point string only at the DTO/mapper boundary. Aggregate in PostgreSQL — never sum via JS floats.
- Recurring expenses are generated **lazily, on read** (`FinanceGenerationService.ensureCurrentPeriodGenerated()`), not via a scheduler — no cron/queue/background-worker infrastructure exists anywhere in this codebase. It backfills every missed period, not just the current one, and is DB-idempotent.
- `/finance/service/*` (n8n-facing, AI Finance Inbox) is gated by `authenticateService` (static bearer token), separate from the user-facing JWT + `requirePermission("finance")` path — same separation `.context/crm.md` already documents for `/crm/service/*`. `FinanceAutomationService` never duplicates business logic; it delegates to `FinanceExpenseService`/`FinanceDashboardService` unchanged and only adds the automation-specific idempotency wrapper (`WorkflowExecutionLog`, keyed on `workflowExecutionId`+`workflowName`).
- Automated expense writes set `Expense.createdBy` to `"<channel>:<externalUserId>"` (e.g. `"slack:U012ABC"`), derived from the caller-supplied `source` envelope — real audit provenance, not `null`, since the AI Finance Inbox always has a real external identity to offer.

## Decisions
ADR-0013 (Finance Management Foundation), ADR-0024 (Finance Automation Service Contract) — `docs/architecture/decisions/`.
