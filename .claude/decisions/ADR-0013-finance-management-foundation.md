# ADR-0013 — Finance Management Foundation: Decimal Money, Lazy Recurrence Generation, and the Recharts Single-Slice Pie Bug

## Context

Sprint A introduces Finance Management, a household expense/budget tracker for two Admin users, reusing this platform's existing Admin Dashboard, sidebar, RBAC, and UI conventions rather than building a standalone app (per the approved Technical Design Document, `.claude/plans` — see `tasks/completed/sprint-A-finance-management.md` for the full sprint log). Three decisions made during this sprint are recorded here because each is either genuinely new to this codebase or non-obvious enough that a future Finance sprint (Bills, Savings, Reports) should follow the same pattern rather than reinvent it.

## Decision 1: Money is `Prisma.Decimal`, converted to a fixed-point string only at the DTO/mapper boundary

`Expense.amount`, `Budget.monthlyLimit` (and future `Bill.amount`, `SavingsGoal.targetAmount`/`currentAmount`) are the first `Decimal` fields anywhere in this schema. Every mapper (`finance-expense.mapper.ts`, `finance-budget.mapper.ts`) converts via `.toFixed(2)`, never `.toString()` — decimal.js's `toString()` drops trailing zeros (`"1900"` instead of `"1900.00"`), which is wrong for a currency value. Aggregation (`sumForPeriod`, `groupByCategoryForPeriod`) happens in PostgreSQL via Prisma's `aggregate`/`groupBy`, and the Dashboard's "Remaining Budget" is computed as `budget.monthlyLimit.minus(totalExpenses)` — Decimal subtraction, never a JS `Number` round-trip. The frontend's `format-currency.ts` only ever formats the already-computed string for display; no arithmetic happens client-side.

**Alternative considered and rejected**: integer cents (`amount Int`). Fully avoids floating-point representation, including in JS, but is a bigger mental-model shift for what's meant to be a simple family tracker, and `Decimal` already gives exact base-10 arithmetic without it. Confirmed with the user before implementation.

## Decision 2: Recurring expenses are generated lazily, on read, not by a scheduler — because no scheduler exists in this codebase

No cron/queue/background-worker infrastructure exists anywhere in this codebase (confirmed by research before this sprint). Rather than introduce one for a single feature, `FinanceGenerationService.ensureCurrentPeriodGenerated()` is called as the first step of every Finance read path that needs the current period's data to be complete (`FinanceExpenseService.list()`, `FinanceDashboardService.getDashboard()`). It walks every active `RecurringExpenseTemplate` whose `lastGeneratedPeriod` is behind the target period, generating one `Expense` per missed month (capped at 24 iterations, a defensive bound, not a product limit) — **it backfills every missed period**, not just the current one, so a household that doesn't open the app for three months doesn't silently under-report those months' recurring costs once they finally do. A DB-level `@@unique([recurringTemplateId, period])` constraint on `Expense` (and the same shape on the not-yet-built `Bill`) guarantees idempotency even under a genuine race (both partners opening the Dashboard within the same second) — `FinanceExpenseRepository.createGeneratedInstance()` catches the resulting `P2002` and treats it as a no-op, not an error.

Two edge cases this resolves explicitly rather than leaving ambiguous, both covered by `finance-generation.service.test.ts`:
- **`dayOfMonth` clamping**: `clampToMonth(period, 31)` in February lands on the 28th/29th, never rolls into March.
- **Mid-month `startDate`**: a template starting July 15 with `dayOfMonth: 1` does not generate a July 1 instance (which would predate the template's own start) — generation begins in August.

**Accepted consequence**: `GET /finance/dashboard` and `GET /finance/expenses` are no longer pure reads — a `GET` can trigger an `INSERT`. This is the same posture this codebase's `AssetReview` already documents for its own lazy-upsert pattern, not a new kind of risk.

**Alternative considered and rejected**: build a minimal `node-cron` scheduler now, since the platform runs as a single long-lived PM2 process and technically could host one. Rejected — confirmed with the user before implementation — because it is new infrastructure this codebase has never needed, and the lazy-on-access approach is designed to be swapped for a real scheduler later (calling `ensureCurrentPeriodGenerated()` on a timer instead of on-request) with zero change to the API, schema, or controllers, so nothing is lost by deferring it.

## Decision 3: A single 100%-value Recharts `Pie` slice needs a plain-SVG fallback, not a Recharts workaround

Browser verification of the Dashboard's category-breakdown chart (the first Pie/donut chart in this codebase — only Bar charts existed before this sprint) surfaced a real rendering bug: when a household has spent in exactly one category, that category is 100% of the total, i.e. a full 360° sweep. Recharts' arc-drawing math collapses the start/end angle to a near-zero-length path in that exact case (confirmed by inspecting the rendered `<path>`'s `d` attribute — it drew a sliver near angle 0, not a circle), so the slice silently renders as nothing, with only the legend text visible. This reproduced regardless of `paddingAngle`. Two-or-more-category breakdowns render correctly — the bug is specific to the single-100%-slice case.

**Fix**: `CategoryBreakdownChart` special-cases `data.length === 1` and renders a plain two-concentric-`<circle>` SVG donut (no arc math at all) instead of Recharts' `Pie`, using the same color token and a matching legend row below it. Two-plus slices continue to use the normal `Pie`/`Cell`/`Legend` composition unchanged.

**Alternative considered and rejected**: try to force a valid arc via `startAngle`/`endAngle` props (e.g. capping the sweep at 359.99°) instead of branching on slice count. Rejected after confirming via DOM inspection that the degenerate angle collapse persisted regardless of `paddingAngle`, meaning the underlying angle math itself (not just the padding) was producing the zero-length path — a plain SVG circle sidesteps the arc math entirely rather than trying to nudge it, and is visually identical for the one case where it applies.

## Consequences

- Any future Finance sub-feature with a money field (Bills, Savings) should follow Decision 1's exact mapper pattern — `.toFixed(2)`, never `.toString()`.
- Any future recurring-schedule feature (recurring bills, in Sprint B) should reuse `FinanceGenerationService`'s pattern rather than inventing a second lazy-generation implementation, and any future scheduler introduced for a different reason should be wired into this same entry point, not a parallel one.
- Any future single-series-capable Recharts `Pie` chart in this codebase (not just Finance) should check for the single-100%-slice case and apply the same plain-SVG fallback — this is a Recharts limitation, not a Finance-specific one, and will recur wherever a categorical breakdown can legitimately collapse to one category.
