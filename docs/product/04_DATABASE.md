# Eyan AI Platform Database Architecture

Version: 1.0

---

# Database Philosophy

The database is designed to support long-term scalability while keeping the initial version simple.

Every entity should have:

- UUID Primary Key
- createdAt
- updatedAt
- createdBy (where applicable)
- updatedBy (where applicable)
- deletedAt (Soft Delete when applicable)

---

# Current Core Entities

## User

Purpose

Represents authenticated users.

Relationships

- Roles
- Projects
- Chats
- Prompts

---

## Role

Purpose

Role-Based Access Control.

Relationships

- Permissions
- Users

---

## Permission

Purpose

Defines system permissions.

Relationships

- Roles

---

## ContentProject

Purpose

Container for AI work.

Relationships

- Conversations
- Prompts
- Generated Content

---

# Version 1.0 Entities

## Conversation

Stores chat sessions.

Relationships

- Project
- Messages
- Provider
- Model

---

## Message

Stores chat messages.

Relationships

- Conversation
- User

---

## Provider

Stores AI providers.

Examples

- Ollama
- OpenAI
- Anthropic
- OpenRouter
- Groq

Relationships

- Models

---

## Model

Stores AI models.

Examples

- llama3
- mistral
- qwen
- claude
- gpt

Relationships

- Provider

---

## Prompt

Reusable prompt library.

Relationships

- Project
- Categories
- Tags

---

## PromptCategory

Prompt grouping.

---

## PromptTag

Prompt labeling.

---

## GeneratedContent

Stores generated AI content.

Relationships

- Project
- Prompt
- Provider

---

## AuditLog

Tracks important actions.

Examples

- Login
- Delete
- Update
- Permission Changes

---

## Settings

Stores application configuration.

---

# Future Entities

## Agent

AI Agent.

---

## Workflow

Workflow definitions.

---

## WorkflowExecution

Workflow execution history.

---

## Memory

Persistent AI memory.

---

## KnowledgeBase

Knowledge collections.

---

## Document

Uploaded documents.

---

## Embedding

Vector embeddings.

---

## VectorStore

Future RAG support.

---

## Notification

System notifications.

---

## ApiKey

API Keys.

---

## Organization

Future multi-tenancy.

---

# CRM Foundation (Sprint 1, extended Sprint 2)

Added outside the original Version 1.0 scope (`02_ROADMAP.md` lists CRM as out of scope for V1.0) — a parallel initiative, see `.claude/decisions/ADR-0018-crm-foundation.md` and `ADR-0019-automation-integration-contract.md`. Shared workspace, no per-row ownership — same posture as Finance below. **No schema changes in Sprint 2** — every field Sprint 2's service endpoints write to already existed from Sprint 1's schema-ahead-of-use design (ADR-0018 Decision 4).

## Lead

Purpose

A prospective customer captured from the (external, not built yet) Lead Form or entered manually.

Relationships

- Activities (LeadActivity)
- AI Analyses (LeadAiAnalysis) — populated by `PATCH /crm/service/leads/:id/qualification` (Sprint 2, dummy/stub payload only — real AI is Sprint 3)
- Execution Logs (WorkflowExecutionLog) — populated by the Sprint 2 service endpoints
- Assigned To (User, nullable)

## LeadActivity

Purpose

One append-only timeline entry per lead — serves as both "Activity History" and "Automation History" (`type`: NOTE / STATUS_CHANGE / ASSIGNMENT / AI_ANALYSIS / AUTOMATION), filtered by type in the UI rather than split into two tables. Sprint 2's service endpoints write `STATUS_CHANGE` and `AI_ANALYSIS` rows with `actorId: null` (system-originated), the first rows in this table with no human actor.

Relationships

- Lead
- Actor (User, nullable — null for system/automation-originated rows, in use since Sprint 2)

## LeadAiAnalysis

Purpose

One row per AI qualification run. Schema-only in Sprint 1; Sprint 2 writes the first rows via `CrmAutomationIngestService.applyQualificationResult()`, using a dummy/stub payload standing in for Sprint 3's real AI call. Preserves history — a re-analyzed lead gets a new row, not an overwrite.

Relationships

- Lead

## WorkflowExecutionLog

Purpose

Platform-wide automation execution telemetry (not CRM-owned — `domain` field, default `"crm"`). Schema-only in Sprint 1; Sprint 2 writes the first rows, one per successful service-endpoint call, keyed by `n8nExecutionId` — the field this sprint's idempotency check (ADR-0019 Decision 5) is built on. Reused by future automation domains (support, recruitment, invoicing) rather than each minting its own table.

Relationships

- Lead (nullable — not every future workflow execution is lead-scoped)

---

## Finance Management

Family expense/budget tracker (`Expense`/`RecurringExpenseTemplate`/`Budget`/`FinanceAuditEvent`) — shared workspace, `finance` permission. See `.claude/decisions/ADR-0013-finance-management-foundation.md`.

## MCP Foundation

Pluggable integration credential/connector layer (`AutomationConnection`/`McpServerConfig`/`AutomationAuditEvent`) — `automation`/`automationcredentials` permissions. See `.claude/decisions/ADR-0012-mcp-foundation.md`.

---

# Entity Relationships

User

↓

Projects

↓

Conversations

↓

Messages

↓

Generated Content

---------------------

Provider

↓

Models

↓

Conversations

---------------------

Prompt Categories

↓

Prompts

↓

Generated Content

---------------------

Roles

↓

Permissions

↓

Users

---

# Database Rules

- UUID everywhere
- Soft delete where appropriate
- Audit sensitive operations
- Avoid duplicated data
- Foreign keys for relationships
- Index searchable columns
- Consistent naming conventions

---

# Future Considerations

Version 2+

- Multi-tenancy
- Vector database
- AI memory
- Team collaboration
- Workflow engine
- Plugin architecture

