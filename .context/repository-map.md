# Repository Map

Single responsibility: where each module lives in the filesystem. Consult this before searching blindly.

## Root
`backend/` `frontend/` `docs/` `tasks/` `tools/`

## Backend domains
| Domain | Glob | Decisions |
|---|---|---|
| Authentication | `auth*` | — |
| Users | `user*` | — |
| Roles | `role*` | — |
| AI Core | `ai*`, `providers/ai-core/*` | ADR-0021 |
| CRM | `crm*` (see `crm.md`) | ADR-0018, 0019, 0020, 0022 |
| Finance | `finance*` (see `finance.md`) | ADR-0013 |
| Automation / MCP | `mcp*`, `provider*`, `providers/*` (see `automation.md`) | ADR-0012 |
| Content Studio | `content*`, `image*`, `video*`, `brand-kit*`, `asset*` (see `content-studio.md`) | ADR-0006–0011 |
| Restaurant Ops | `organization*`, `restaurant*`, `branch*`, `branch-member*`, `menu-category*`, `menu-item*`, `staff-membership*`, `module-registry*`, `unit*`, `ingredient-category*`, `supplier*`, `ingredient*`, `recipe*`, `recipe-ingredient*` (see `restaurant.md`) | ADR-0025, 0026, 0036, 0037 |

Backend globs apply across `backend/src/{controllers,services,repositories,dto,validators}/`. Tenant authorization middleware lives at `backend/src/middleware/tenant.middleware.ts`. Seed data: `backend/prisma/bootstrap.ts` (platform-required, automated in `deploy.sh`) vs. `backend/prisma/seed.ts` (adds demo/sample content, manual only) — see `deployment.md`, ADR-0035.

## Frontend features
`frontend/src/features/{ai-core, crm, finance, automation, content-studio, auth, dashboard, users, roles, settings, portfolio, presentation-engine, organizations, restaurant-ops}`

## AI providers (AI Core only)
Ollama, OpenAI, Anthropic, Gemini — registered in `AiCoreProviderFactory`. Not the same registry as MCP connectors — see `automation.md`.

## Documentation
| Need | File |
|---|---|
| Architecture (short) | `architecture.md` |
| Architecture (deep) | `docs/ARCHITECTURE.md` |
| Current status | `current-sprint.md` |
| Recent history | `PROJECT_STATE.md` |
| Full sprint history | `tasks/completed/` |
| Cross-cutting rules | `coding-rules.md` |
| Decisions (ADRs) | `docs/architecture/decisions/ADR-NNNN` |

Rule: never search the repository blindly — check this map first.
