# backend/src/routes — Index

All routes live under `v1/` (API versioning convention — there is no `v2/` yet; add one rather than breaking `v1/`'s contract). Filenames follow `<domain>.routes.ts` and register onto their matching controller — grep the domain name to find both.

| Domain | Files |
|---|---|
| AI Core | `ai-core-{audit-logs,brains,capabilities,health,models,playground,providers,service,usage}.routes.ts` (9) |
| CRM | `crm-leads.routes.ts`, `crm-service.routes.ts` (n8n-facing, see `.context/crm.md`) |
| Finance | `finance-{budget,dashboard,expenses}.routes.ts` |
| Automation / MCP | `automation-{audit-logs,connections,mcp-servers}.routes.ts` |
| Video | `video-{assets,execution,sources,workflow-planner}.routes.ts` |
| Content Studio | `content.routes.ts`, `image.routes.ts`, `brand-kits.routes.ts`, `asset.routes.ts`, `prompt-templates.routes.ts`, `saved-prompts.routes.ts` |
| Chat | `chat.routes.ts`, `chat-stream.routes.ts` |
| Auth / Access | `auth.routes.ts`, `users.routes.ts`, `roles.routes.ts`, `permissions.routes.ts` |
| Other | `analytics.routes.ts`, `health.routes.ts`, `model.routes.ts`, `projects.routes.ts` |
