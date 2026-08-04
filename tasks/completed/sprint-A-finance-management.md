# Sprint A — Finance Management Foundation (Dashboard + Expenses)

Status: Completed

## Goal

Add a Finance Management module — a simple family expense/budget tracker for two Admin users — reusing the platform's existing Admin Dashboard, sidebar, RBAC, and UI conventions, per the approved Technical Design Document. Phase 1 MVP scope only: Finance Dashboard and full Expense CRUD with a monthly budget.

## Scope

### In Scope

- Prisma schema: `Expense`, `RecurringExpenseTemplate`, `Budget`, `FinanceAuditEvent` models; `ExpenseCategory`, `PaymentMethod`, `RecurrenceFrequency`, `FinanceAuditAction` enums.
- `finance` RBAC permission, seeded and auto-granted to Owner; manually granted to Admin (mirrors the one-time Roles-UI step a real Owner would take).
- Backend: Expense CRUD, Budget get/set (with lazy carry-forward across months), Dashboard aggregate endpoint, lazy on-access recurring-expense generation.
- Frontend: Finance Dashboard page (4 stat cards, spending-trend line chart, category-breakdown pie chart, recent expenses list), Expenses page (searchable/filterable/sortable table, create/edit/delete dialogs), sidebar integration (new collapsible "Finance Management" group).
- An optional "Repeat monthly" toggle on the Expense form that creates a `RecurringExpenseTemplate` alongside the expense.

### Out of Scope

- Bills, Savings, Reports, receipt upload, recurring-template management UI (all later sprints per the roadmap).
- AI insights, notifications, any scheduler/cron infrastructure.

## What Shipped

**Backend**: full layered implementation (routes → validators → controllers → services → repositories → Prisma) for `/api/v1/finance/{dashboard,expenses,budget}`, following every existing platform convention exactly — `express-validator` chains, `ApiResponse`/`ApiError`, `requirePermission("finance")`, DI-seam-friendly service constructors, fire-and-forget `FinanceAuditEvent` writes mirroring `AutomationAuditService`. `FinanceGenerationService` implements the lazy on-access recurrence algorithm (backfill, dayOfMonth clamping, mid-month-start skip, DB-level idempotency) — see ADR-0013.

**Frontend**: `features/finance/` module — TanStack Query hooks, a zod-validated Expense form (only amount + category required, everything else optional, for sub-30-second entry), a TanStack Table Expenses view reusing the shared `data-table/*` toolbar/pagination/faceted-filter components, and the first Line and Pie charts in this codebase (`SpendingTrendChart`, `CategoryBreakdownChart`), following the existing Bar-chart Card/`ResponsiveContainer`/CSS-chart-token styling convention. New "Finance Management" sidebar group (Dashboard, Expenses) — the first real use of the `NavCollapsible` parent-with-children shape; `nav-group.tsx` already fully supported it, no component change needed.

**Gap filled relative to the approved TDD**: the TDD's `Expense` schema omitted `paymentMethod`, though it was an explicit field in the original product brief — added as an optional `PaymentMethod` enum, matching `ExpenseCategory`'s fixed-enum precedent.

## Files Created / Modified

Created: `backend/src/{routes/v1,controllers,services,repositories,validators,dto,errors,utils}/finance-*.ts` (25 files) and their `.test.ts` counterparts (4 files); `frontend/src/features/finance/**` (api, types, schemas, hooks, lib, pages/dashboard, pages/expenses — ~20 files); `frontend/src/routes/app/_authenticated/finance/{index,expenses/index}.tsx`; one Prisma migration (`20260729194102_add_finance_core`); this sprint log; `docs/architecture/decisions/ADR-0013-finance-management-foundation.md`.

Modified (small, additive touches only): `backend/prisma/schema.prisma` (new models/enums + one `User` back-relation), `backend/prisma/seed.ts` (one new permission tuple), `backend/src/app.ts` (three new route mounts), `frontend/src/components/layout/data/sidebar-data.ts` (one new nav group), `CHANGELOG.md`, `PROJECT_STATE.md`.

## Database Changes

Migration `20260729194102_add_finance_core`: four new tables (`Expense`, `RecurringExpenseTemplate`, `Budget`, `FinanceAuditEvent`), four new enums, one new index set, one new `FinanceAuditEvent.actorId → User` foreign key. Purely additive — zero changes to any existing table. Applied and verified against the real development database (`prisma migrate dev`, zero drift).

## API Changes

New, all under `/api/v1/finance/...`, all gated by `authenticate` + `requirePermission("finance")`:

- `GET /finance/dashboard` — budget, totalExpenses, remainingBudget, categoryBreakdown, 6-month spendingTrend, recentExpenses.
- `GET/POST /finance/expenses`, `GET/PATCH/DELETE /finance/expenses/:id`.
- `GET/PUT /finance/budget`.

## Validation

- Build: clean (`tsc -b && vite build` on frontend; `tsc` build target unaffected on backend).
- Typecheck: clean on both sides (`tsc --noEmit` backend, `tsc -b` frontend).
- Lint: clean on both sides — backend has no lint script; frontend `eslint` clean except the pre-existing `react-hooks/incompatible-library` warning on `useReactTable()`, confirmed identical on the pre-existing `users-table.tsx`, not new.
- Tests: backend 691/691 passing (23 new: `finance-period.test.ts`, `finance-generation.service.test.ts`, `finance-expense.service.test.ts`, `finance-budget.service.test.ts`, `finance-dashboard.service.test.ts`); frontend 366/370 passing, 4 failing — the same pre-existing, already-documented baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2), confirmed unrelated by re-running both files against the pre-Finance baseline (`git stash`) before making the sidebar change, where they failed identically.

**Live-validated** against the real EYAN Studio development database, using a throwaway backend/frontend instance on spare ports (PM2 production backend on :3001 and the persistent dev frontend on :5180 both left untouched throughout) and a temporary, since-deleted verification user with the `Admin` role: signed in, confirmed the "Finance Management" sidebar group renders and expands, set a monthly budget (persisted and reflected in Remaining Budget), added an expense (appeared in both the table and the Dashboard's Recent Expenses/Total Expenses/charts), edited it, and deleted it — each with a correct toast and no console errors. Two real bugs were found and fixed during this pass, not just asserted away:
1. The frontend requested `pageSize=200` on the Expenses list, but the backend validator caps `pageSize` at 100 — a 400 that surfaced as "Failed to load expenses." Fixed by lowering the frontend default to 100.
2. The category-breakdown Pie chart rendered nothing when there was only one expense category (a Recharts single-100%-slice arc-drawing bug) — fixed per ADR-0013 Decision 3.

## Decisions Made

See `docs/architecture/decisions/ADR-0013-finance-management-foundation.md`: Decimal money end-to-end, the lazy on-access recurrence-generation algorithm (and why no scheduler was introduced), and the Recharts single-slice Pie chart bug/fix.

## Follow-ups for Future Sprints

- Sprint B: Bills, `RecurringBillTemplate`, `$transaction`-backed mark-paid flow (first `$transaction` usage in this codebase).
- Sprint C: Savings goals/contributions (second `$transaction` usage), Finance Settings page (budget form + recurring-template management UI — there is currently no way to edit/deactivate a `RecurringExpenseTemplate` once created via the Expense dialog's "Repeat monthly" toggle, a named, deferred gap, not an oversight).
- Sprint D: Reports (CSV/Excel/PDF export), receipt upload (`receiptPath` column exists and is unused; Multer/`LocalDiskStorageProvider` extension deferred).
- The single-100%-slice Recharts Pie bug (ADR-0013 Decision 3) is a Recharts limitation, not Finance-specific — worth a shared fix if a second single-series-capable Pie chart is ever built elsewhere in this codebase.
- `finance` is currently granted to `Owner` (seed-time) and `Admin` (manually, this sprint) — any future third role needing Finance access must be granted it explicitly via the Roles UI, same as every other permission in this codebase.
