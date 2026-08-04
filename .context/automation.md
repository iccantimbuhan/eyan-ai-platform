# Automation

Single responsibility: the MCP / external-connector integration layer. This is not the CRM→n8n pipeline — see `crm.md` for that.

## Files
Backend only: `backend/src/controllers/mcp*`, `backend/src/controllers/provider*`, `backend/src/services/mcp*`, `backend/src/providers/*`

## Model
Registry pattern: connectors register into `McpConnectorFactory`. Credentials and connections are isolated per connector. Business logic stays in services, never inside a connector plugin.

Proven end-to-end with one deterministic `FakeMcpConnector`. Real providers (Canva, CapCut, GitHub, Docker, Filesystem, Google Drive, Slack, Discord, Notion, PostgreSQL, Redis, n8n) register into this same layer as they're built — none are live except the fake one.

Do not confuse this with AI Core's own provider registry (`AiCoreProviderFactory` — Ollama/OpenAI/Anthropic/Gemini, see `ai-core.md`). MCP connectors and AI Core providers are two separate registries for two separate concerns.

## Decisions
ADR-0012 (MCP Foundation) — `docs/architecture/decisions/`.
