# ADR-0034 — Automation & Communication Layer

**Status: Proposed — not implemented in Sprint 0.** Sprint 0 is tenancy foundation only; no Slack/automation work exists yet. This ADR records the intended design ahead of Sprint 7, per the approved architecture package, and supersedes the informal "Slack as MCP Connector" note from the original architecture assessment — same conclusion, broadened to every channel.

## Context

The platform needs Slack now and WhatsApp/Telegram/Email later, all without business logic leaking into a chat integration, and without routing commercial customer data through `eyan-automation-hub` — a companion repo explicitly documented as an independent portfolio project with its own lifecycle and security posture, today only relaying one-way webhooks for CRM/Finance.

## Decision

Treat every channel uniformly as a thin translator sitting in front of the same Services/Capabilities the web app calls:

- **Interactive channels** (Slack now; WhatsApp/Telegram later) register as MCP connectors into the existing `McpConnectorFactory` — e.g. `SlackMcpConnector` — each translating a channel-native message (slash command, file upload, question) into a call against an existing Service (upload → `IngestionService`, question → an AI Core Capability, record → the relevant Restaurant service). Connections reuse the existing `AutomationConnection`/`McpServerConfig` tables, scoped by `organizationId`.
- **Inbound automation/webhooks** (e.g. n8n, if ever used for Restaurant) reuse the existing `authenticateService` + `*-service.routes.ts` + thin pass-through automation-service pattern already proven by Finance (ADR-0024) and CRM (ADR-0019) — unchanged mechanism, new route file.
- **Outbound notifications** (a Slack message on `DailyClosingCompleted`, for instance) are triggered by Domain Event consumers, calling the same connector the interactive path uses — one code path for "send a Slack message," not two.
- **Email** has no existing mechanism in this codebase; lowest priority, deferred until a real need arises, implemented as another thin connector when it does.
- `eyan-automation-hub`/n8n remains available for internal orchestration needs unrelated to customer-facing channels, but is explicitly **not** the path for Restaurant's Slack upload/ask/record/receive loop.

## Consequences

Positive:
- One registry, one connection-storage mechanism, one "business logic never leaves the platform" guarantee enforced structurally (connectors have no Prisma access, by convention, same as today's `FakeMcpConnector`).

Negative:
- Slack's interactive surface (slash commands, file uploads) is genuinely new code with no existing precedent in this codebase to copy verbatim — real design time is needed in Sprint 7, not just wiring.

## Alternatives Considered

1. Route Slack through `eyan-automation-hub`, like CRM/Finance's existing webhook integrations — rejected; couples a commercial customer data path (Slack tokens, uploaded files) to an independent portfolio repo's lifecycle/security posture, and that repo only relays one-way webhooks today, not interactive bot behavior.
2. A bespoke Slack integration outside the MCP registry — rejected; duplicates a pattern that already exists and is already the documented home for Slack in `.context/automation.md`'s connector roadmap.
