# ADR-0035 — Deployment Bootstrap Strategy: Separating Platform Bootstrap from Demo/Sample Seeding

## Context

After Sprint 0 deployed, the Restaurant Operations sidebar item stayed hidden in production despite `prisma migrate deploy` having created every new tenancy table (`Organization`, `Restaurant`, `Branch`, `OrganizationMember`, `RestaurantMember`, `OrganizationModule`) successfully. Investigation (read-only DB queries, no code changes) found every one of those tables empty and the `restaurant` `Permission` row missing entirely. Root cause: `deploy.sh`'s documented flow — `git pull → pnpm install → prisma migrate deploy → build backend → build frontend → restart → health poll → warm Ollama → copy frontend dist → nginx reload` — has **never** included a seed step. All of this platform's role/permission/prompt-template/demo data has only ever reached production through a human manually running `pnpm db:seed` after a deploy; this time, that manual step was missed. This is not an architectural defect in Sprint 0's design (confirmed by re-reading the approved package) — it is a gap in the deployment *process* that Sprint 0's tenancy foundation happened to expose for the first time, because it was the first feature whose correctness depended on seeded data (RBAC roles/permissions) that didn't already exist from a prior sprint.

## Decision 1: Split seed data into two tiers — platform bootstrap vs. demo/sample content

`backend/prisma/bootstrap.ts` (new) owns exactly the subset that is **safe and required to run against any environment, including production, on every deploy**: roles, permissions (including `restaurant`), the Owner role's full permission grant, and the Restaurant Operations tenancy foundation (`seedRestaurantTenancyFoundation` — Organization, Restaurants, one default Branch each, the `restaurant` `OrganizationModule` row, and `OrganizationMember` granted to whichever users already hold the platform's global `Owner` role). `backend/prisma/seed.ts` (existing, still the full local/dev setup) now calls `bootstrapPlatform()` first, then layers on demo/sample content unchanged: the portfolio demo account, the seeded Content Studio demo project, AI Core foundation/Brains, and the prompt template library. There is exactly one implementation of "what bootstrap means" — `seed.ts` composes it, rather than duplicating it.

Every write in `bootstrapPlatform()` is an upsert or a find-or-create; running it any number of times against the same database is a no-op after the first run. Verified directly: re-ran `pnpm db:bootstrap` twice against an isolated dev database with identical results both times, and ran it a first time against production with no side effects beyond the intended new rows (`Permission` count went from 31 to exactly 32 — the one new `restaurant` row — and every pre-existing table's row count was confirmed unchanged).

## Decision 2: `OrganizationMember` is granted by existing platform role, never a hardcoded email or a placeholder account

The original Sprint 0 implementation created a fake `manager@eyan-restaurants.dev` placeholder user specifically to hold `OrganizationMember`. This is removed. Instead, `seedRestaurantTenancyFoundation()` grants `OrganizationMember(OWNER)` to every user who already holds the platform's global `Owner` role — a real production account (`iccantimbuhan@gmail.com`) already had that role from a prior sprint, so it received tenant access automatically the moment bootstrap ran, with no placeholder credential ever created and no hardcoded email in source control. This generalizes correctly to any environment: whoever is Owner there gets tenant access, automatically, on the very first bootstrap run.

## Decision 3: Bootstrap is automated in `deploy.sh`; full demo/sample seeding stays manual, permanently

`deploy.sh` now runs `pnpm db:bootstrap` immediately after `pnpm prisma migrate deploy`, before the build steps. `pnpm db:seed` (full demo content) is deliberately **not** added to `deploy.sh` and should never be — this is the safest long-term strategy for a commercial SaaS platform, for a reason specific to that context: demo/sample data (a portfolio demo account, a seeded Content Studio project) is appropriate for this one self-hosted, single-tenant-today deployment, but would be actively wrong to run unconditionally against a future paying commercial tenant's database once real customer onboarding exists. Bootstrap data carries no such risk — by definition it's platform-required, tenant-agnostic-in-mechanism (even though today's `seedRestaurantTenancyFoundation` hardcodes this platform's one real Organization, which is itself flagged below as a Sprint 1 boundary, not something this ADR pretends is already multi-customer-ready), and idempotent, so automating it removes exactly the class of failure that happened here (a human forgetting a manual step) without introducing any new risk.

## Consequences

Positive:
- The exact failure mode that caused this incident — a human forgetting to run a manual seed step after deploy — is now structurally impossible for bootstrap data; it runs every deploy, unconditionally, idempotently.
- `seed.ts` and `bootstrap.ts` share one implementation via composition, not two copies of the roles/permissions logic that could drift apart.
- No fake credential exists in source control or in the database for Restaurant Operations membership; access is derived from real RBAC state.

Negative / accepted:
- `bootstrapPlatform()`'s Restaurant tenancy seed still hardcodes one real Organization name and two real Restaurant names — appropriate for this platform's current single-deployment reality (this is that business's own real bootstrap data, not a generic template), but it is **not** a multi-customer onboarding mechanism. A real commercial customer's Organization/Restaurant/Branch must be created through Sprint 1's admin UI/API, never by editing this script per customer.
- `bootstrap.ts` running on every deploy means every deploy re-verifies/re-upserts roles and permissions even when nothing changed — a small, constant-time cost, acceptable at this scale.

## Alternatives Considered

1. Keep seeding entirely manual, just document the step more prominently in `deployment.md` — rejected; documentation alone already existed implicitly (the step was simply always manual) and still failed once under real conditions; a process control (automation) is a stronger fix than a stronger reminder.
2. Automate the *full* `pnpm db:seed` (including demo/sample content) in `deploy.sh` — rejected; would unconditionally recreate/touch demo accounts and sample content on every production deploy, which is unnecessary today and actively wrong once real commercial tenants exist on this same pipeline.
3. Fold `bootstrapPlatform()`'s logic directly into `deploy.sh` as inline `psql`/shell commands instead of a Prisma script — rejected; loses type safety, Prisma's upsert semantics, and the ability to unit-test/reuse the same logic from `seed.ts`.
