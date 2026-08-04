# Repositories

Purpose

Repositories are the only layer that talks to Prisma.

Responsibilities

- Database queries
- Persistence
- Transactions

Repositories contain no business logic.

## Index, by domain

**Users** — `user.repository.ts`

**Roles** — `role.repository.ts`

**AI Core** — `ai-audit-event.repository.ts`, `ai-brain-mcp-tool.repository.ts`, `ai-brain.repository.ts`, `ai-capability.repository.ts`, `ai-conversation.repository.ts`, `ai-evaluation.repository.ts`, `ai-model.repository.ts`, `ai-prompt.repository.ts`, `ai-provider-credential.repository.ts`, `ai-provider.repository.ts`, `ai-routing-policy.repository.ts`, `ai-usage-log.repository.ts` — see `.context/ai-core.md`

**CRM** — `crm-ai-analysis.repository.ts`, `crm-lead-activity.repository.ts`, `crm-lead.repository.ts`, `workflow-execution-log.repository.ts` — see `.context/crm.md`

**Finance** — `finance-audit-event.repository.ts`, `finance-budget.repository.ts`, `finance-expense.repository.ts`, `finance-recurring-expense-template.repository.ts` — see `.context/finance.md`

**Automation / MCP** — `automation-audit-event.repository.ts`, `automation-connection.repository.ts`, `mcp-server-config.repository.ts` — see `.context/automation.md`

**Content Studio** — `asset-comment.repository.ts`, `asset-review-assignment.repository.ts`, `asset-review-event.repository.ts`, `asset-review.repository.ts`, `asset-version.repository.ts`, `brand-kit.repository.ts`, `content.repository.ts`, `image.repository.ts`, `project.repository.ts`, `prompt-template.repository.ts`, `publishing-record.repository.ts`, `saved-prompt.repository.ts`, `video-asset.repository.ts`, `video-workflow-plan.repository.ts` — see `.context/content-studio.md`

**Analytics** — `analytics-event.repository.ts`
