# Backend Services

Purpose

Business logic lives here.

Rules

- Services contain all business logic.
- Controllers should never contain business logic.
- Services may call repositories.
- Services may call providers.
- Services never access Prisma directly.
- Services should remain focused on a single domain.

## Index, by domain

**Auth** — `auth.service.ts`

**Users** — `users.service.ts`

**Roles** — `roles.service.ts`

**AI Core** — `ai-audit.service.ts`, `ai-brain-mcp-tool.service.ts`, `ai-brain.service.ts`, `ai-cache-invalidation.events.ts`, `ai-capability.service.ts`, `ai-conversation.service.ts`, `ai-evaluation.service.ts`, `ai-model.service.ts`, `ai-playground.service.ts`, `ai-prompt.service.ts`, `ai-provider-health.service.ts`, `ai-provider.service.ts`, `ai-routing-policy.service.ts`, `ai-routing.service.ts`, `ai-usage.service.ts` — see `.context/ai-core.md`

**Chat** (legacy, pre-AI-Core, not yet migrated) — `chat.service.ts`

**CRM** — `crm-automation-ingest.service.ts`, `crm-lead-transitions.ts`, `crm-lead.service.ts` — see `.context/crm.md`

**Finance** — `finance-audit.service.ts`, `finance-budget.service.ts`, `finance-dashboard.service.ts`, `finance-expense.service.ts`, `finance-generation.service.ts` — see `.context/finance.md`

**Automation / MCP** — `automation-audit.service.ts`, `automation-connection.service.ts`, `automation-webhook.service.ts`, `credential-manager.service.ts`, `mcp-health.service.ts`, `mcp-server-config.service.ts` — see `.context/automation.md`

**Content Studio** — `asset.service.ts`, `brand-kit.service.ts`, `content.service.ts`, `image.service.ts`, `projects.service.ts`, `prompt-template.service.ts`, `saved-prompt.service.ts`, `video-asset.service.ts`, `video-execution-engine.service.ts`, `video-source.service.ts`, `video-workflow-planner.service.ts` — see `.context/content-studio.md`

**Analytics** — `analytics.service.ts`

**Platform** — `health.service.ts`, `model.service.ts` (legacy, predates AI Core's own model registry)
