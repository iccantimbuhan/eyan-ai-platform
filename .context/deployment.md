# Deployment

Single responsibility: how code actually reaches production. Confirmed against `deploy.sh` directly, not inferred.

## Mechanism
- Backend runs as a systemd service (`eyan-backend`). An `ecosystem.config.cjs` (PM2) and an empty `docker-compose.yml` also exist in the repo but are **not** what `deploy.sh` uses — verify with the user before assuming either is live if you're touching deploy infrastructure.
- No CI/CD auto-deploy exists. Deploys are manual, via `./deploy.sh`, and only run from the `dev` branch.

## deploy.sh flow
`git pull origin dev` → `pnpm install` → `prisma migrate deploy` → **`pnpm db:bootstrap`** → build backend → build frontend → `systemctl restart eyan-backend` → poll `/api/v1/health` until healthy (30 retries) → warm the Ollama model into memory (`/api/generate` with an empty prompt) → copy `frontend/dist` to `/var/www/eyan.fyi` → `nginx reload`.

## Seeding — bootstrap vs. demo/sample (ADR-0035)
Two tiers, deliberately not one:
- **`pnpm db:bootstrap`** (`backend/prisma/bootstrap.ts`) — roles, permissions, Owner's full permission grant, Restaurant Operations tenancy foundation. Idempotent, platform-required, **automated in `deploy.sh`** — runs on every deploy.
- **`pnpm db:seed`** (`backend/prisma/seed.ts`) — everything `db:bootstrap` does, plus demo/sample content (portfolio demo account, demo Content Studio project, prompt template library). **Deliberately manual, permanently** — never add this to `deploy.sh`. Appropriate for this one self-hosted deployment today; would be actively wrong to run unconditionally against a future paying commercial tenant's database.

If a new module needs platform-required bootstrap data (a new default permission, a new required config row), add it to `bootstrap.ts`, not `seed.ts` — `seed.ts` already composes `bootstrapPlatform()`, so there's one implementation, not two.

## Known risks
- A stale deployment (old build still running in memory) has caused confusion in past sprints. After deploying, verify `/api/v1/health` reflects the expected model/config — not just that it returns 200.
- (Resolved 2026-08-06, ADR-0035) Seeding had been a manual, easy-to-forget step for every prior sprint's data (roles, permissions, prompt templates) — it was simply never caught until Sprint 0's Restaurant Operations tenancy data depended on it in a user-visible way (a hidden sidebar item). Bootstrap data is now automated; watch for the same class of gap if a future module introduces new *demo-only* seed data that quietly becomes load-bearing — it won't run automatically, by design.
