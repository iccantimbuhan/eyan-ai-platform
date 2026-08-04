# Finance

Single responsibility: the Finance (household expense/budget) module — file locations and rules unique to this domain.

## Files
- Backend: `backend/src/{controllers,services,repositories}/finance-*`
- Frontend: `frontend/src/features/finance`

## Rules
- Money (`Expense.amount`, `Budget.monthlyLimit`) is `Prisma.Decimal`, converted to a fixed-point string only at the DTO/mapper boundary. Aggregate in PostgreSQL — never sum via JS floats.
- Recurring expenses are generated **lazily, on read** (`FinanceGenerationService.ensureCurrentPeriodGenerated()`), not via a scheduler — no cron/queue/background-worker infrastructure exists anywhere in this codebase. It backfills every missed period, not just the current one, and is DB-idempotent.

## Decisions
ADR-0013 (Finance Management Foundation) — `docs/architecture/decisions/`.
