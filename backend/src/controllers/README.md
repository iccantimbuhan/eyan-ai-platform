# Controllers

Purpose

Controllers receive HTTP requests.

Responsibilities

- Validate input
- Call services
- Return DTOs

Controllers should never contain business logic.

## Index, by domain

**Auth** — `auth.controller.ts`

**Users** — `users.controller.ts`

**Roles** — `roles.controller.ts`

**AI Core** — `ai-audit.controller.ts`, `ai-brain-mcp-tool.controller.ts`, `ai-brain.controller.ts`, `ai-capability.controller.ts`, `ai-evaluation.controller.ts`, `ai-health.controller.ts`, `ai-model.controller.ts`, `ai-playground.controller.ts`, `ai-prompt.controller.ts`, `ai-provider.controller.ts`, `ai-routing-policy.controller.ts`, `ai-usage.controller.ts` — see `.context/ai-core.md`

**Chat** (legacy, pre-AI-Core, not yet migrated) — `chat.controller.ts`

**CRM** — `crm-automation.controller.ts`, `crm-lead.controller.ts` — see `.context/crm.md`

**Finance** — `finance-budget.controller.ts`, `finance-dashboard.controller.ts`, `finance-expense.controller.ts` — see `.context/finance.md`

**Automation / MCP** — `automation-audit-log.controller.ts`, `automation-connection.controller.ts`, `mcp-server-config.controller.ts` — see `.context/automation.md`

**Content Studio** — `asset.controller.ts`, `brand-kit.controller.ts`, `content.controller.ts`, `image.controller.ts`, `projects.controller.ts`, `prompt-template.controller.ts`, `saved-prompt.controller.ts`, `video-asset.controller.ts`, `video-execution.controller.ts`, `video-source.controller.ts`, `video-workflow-planner.controller.ts` — see `.context/content-studio.md`

**Analytics** — `analytics.controller.ts`

**Platform** — `health.controller.ts`, `model.controller.ts` (legacy, predates AI Core's own model registry)
