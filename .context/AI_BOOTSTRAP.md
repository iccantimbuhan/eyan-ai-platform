# AI Bootstrap

Every AI assistant (Claude, ChatGPT, Gemini, Qwen, Codex, etc.) starts here. `.context/` is the single source of truth for AI collaboration in this repository.

Do not scan the repository. Do not read `tasks/completed/` or `docs/product/` unless explicitly asked. Load only the files your task needs.

## Project
Eyan AI Platform — a self-hosted, production-development enterprise platform: Content Studio, CRM, Finance, Automation (MCP), AI Core.

Stack: Node/Express/TypeScript/Prisma/PostgreSQL backend; React/TypeScript/Vite/TanStack Router+Query/shadcn frontend; Nginx/VPS/systemd infra (see `deployment.md`); Ollama/OpenAI/Anthropic/Gemini via AI Core.

## Read for your task
| Task | Read |
|---|---|
| Backend | `backend.md` + `coding-rules.md` |
| Frontend | `frontend.md` + `coding-rules.md` |
| AI Core | `ai-core.md` + `coding-rules.md` |
| CRM | `crm.md` + `coding-rules.md` |
| Finance | `finance.md` + `coding-rules.md` |
| Content Studio (content/image/video/brand-kit/asset) | `content-studio.md` + `coding-rules.md` |
| Automation / MCP | `automation.md` + `coding-rules.md` |
| Deployment | `deployment.md` |
| "Where is X?" | `repository-map.md` |
| "What's happening right now?" | `current-sprint.md` |
| Architecture questions | `architecture.md` |

## Deep reference — open only if the above isn't enough
| Need | Location |
|---|---|
| Full architecture | `docs/ARCHITECTURE.md` |
| Product spec / roadmap | `docs/product/` |
| Recent history | `PROJECT_STATE.md` |
| Full sprint history | `tasks/completed/` |
| Decisions (ADRs) | `docs/architecture/decisions/` |
| Engineering playbooks / skills / prompt templates | `docs/engineering/`, `docs/skills/`, `docs/prompts/` |
