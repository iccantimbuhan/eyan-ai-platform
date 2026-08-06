# backend/src/routes — Index

All routes live under `v1/` (API versioning convention — there is no `v2/` yet; add one rather than breaking `v1/`'s contract). Filenames follow `<domain>.routes.ts` and register onto their matching controller — grep the domain name to find both.

| Domain | Files |
|---|---|
| AI Core | `ai-core-{audit-logs,brains,capabilities,health,models,playground,providers,service,usage}.routes.ts` (9) |
| CRM | `crm-leads.routes.ts`, `crm-service.routes.ts` (n8n-facing, see `.context/crm.md`) |
| Finance | `finance-{budget,dashboard,expenses}.routes.ts` |
| Restaurant Ops | `organizations.routes.ts` (tenant context), `organization-restaurants.routes.ts` (create/list Restaurants under an Organization), `restaurants.routes.ts` (single-Restaurant ops + create/list Branches/Menu Categories/Menu Items/Units/Ingredient Categories/Suppliers/Ingredients/Recipes under it), `branches.routes.ts`, `menu-categories.routes.ts`, `menu-items.routes.ts`, `units.routes.ts`, `ingredient-categories.routes.ts`, `suppliers.routes.ts`, `ingredients.routes.ts`, `recipes.routes.ts` (single-resource ops by their own id, `recipes.routes.ts` also holds create/list of its ingredient lines), `recipe-ingredients.routes.ts` (single-line ops by their own id), `organization-staff.routes.ts`, `restaurant-staff.routes.ts` (Staff Management, `requireTenantRole('OWNER','MANAGER')`) — see `.context/restaurant.md` |
| Automation / MCP | `automation-{audit-logs,connections,mcp-servers}.routes.ts` |
| Video | `video-{assets,execution,sources,workflow-planner}.routes.ts` |
| Content Studio | `content.routes.ts`, `image.routes.ts`, `brand-kits.routes.ts`, `asset.routes.ts`, `prompt-templates.routes.ts`, `saved-prompts.routes.ts` |
| Chat | `chat.routes.ts`, `chat-stream.routes.ts` |
| Auth / Access | `auth.routes.ts`, `users.routes.ts`, `roles.routes.ts`, `permissions.routes.ts` |
| Other | `analytics.routes.ts`, `health.routes.ts`, `model.routes.ts`, `projects.routes.ts` |
