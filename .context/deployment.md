# Deployment

Single responsibility: how code actually reaches production. Confirmed against `deploy.sh` directly, not inferred.

## Mechanism
- Backend runs as a systemd service (`eyan-backend`). An `ecosystem.config.cjs` (PM2) and an empty `docker-compose.yml` also exist in the repo but are **not** what `deploy.sh` uses — verify with the user before assuming either is live if you're touching deploy infrastructure.
- No CI/CD auto-deploy exists. Deploys are manual, via `./deploy.sh`, and only run from the `dev` branch.

## deploy.sh flow
`git pull origin dev` → `pnpm install` → `prisma migrate deploy` → build backend → build frontend → `systemctl restart eyan-backend` → poll `/api/v1/health` until healthy (30 retries) → warm the Ollama model into memory (`/api/generate` with an empty prompt) → copy `frontend/dist` to `/var/www/eyan.fyi` → `nginx reload`.

## Known risk
A stale deployment (old build still running in memory) has caused confusion in past sprints. After deploying, verify `/api/v1/health` reflects the expected model/config — not just that it returns 200.
