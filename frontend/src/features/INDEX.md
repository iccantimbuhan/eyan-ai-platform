# frontend/src/features — Index

17 features. Each is internally self-contained (its own mix of `api/components/hooks/lib/schemas/types`) — see `.context/frontend.md` for that shape. This file answers "which feature owns X," not "how is a feature structured."

| Feature | Owns |
|---|---|
| `content-studio/` | Content/image/video/brand-kit/asset generation, review, publishing. Largest feature by far — see `.context/content-studio.md`. |
| `ai-core/` | AI Core admin/playground UI — Capabilities, Brains, Providers, Usage, Health. See `.context/ai-core.md`. |
| `presentation-engine/` | Guided product-tour overlay system (narration, spotlight, cross-route navigation). |
| `automation/` | MCP connector management UI. See `.context/automation.md`. |
| `auth/` | Login, registration, session restoration, RBAC gating. |
| `finance/` | Expense/budget tracker. See `.context/finance.md`. |
| `crm/` | Leads dashboard, detail, pipeline. See `.context/crm.md`. |
| `users/` | User management. |
| `settings/` | User/account settings. |
| `roles/` | RBAC role management. |
| `ai-chat/` | Legacy direct-Ollama chat UI — predates AI Core, not yet migrated (see `.context/ai-core.md` rollout status). |
| `portfolio/` | Public homepage / portfolio landing. |
| `lead-capture/` | Public, unauthenticated `/contact` lead form. |
| `dashboard/` | Top-level admin dashboard. |
| `errors/` | Error pages (404, etc.). |
| `models/` | Legacy AI model selection UI — predates AI Core's own model registry. |
| `providers/` | Legacy provider config UI — predates AI Core's own provider registry. |
