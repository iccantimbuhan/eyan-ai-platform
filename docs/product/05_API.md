# Eyan AI Platform API Specification

Version: 1.0

---

# API Philosophy

The API follows REST principles.

Goals:

- Predictable
- Consistent
- Versioned
- Secure
- Easy to extend

Base URL

/api/v1

---

# Authentication

POST /auth/login

POST /auth/logout

POST /auth/refresh

GET /auth/me

PATCH /auth/profile

PATCH /auth/password

---

# Dashboard

GET /dashboard/stats

GET /dashboard/activity

GET /dashboard/health

---

# Projects

GET /projects

GET /projects/:id

POST /projects

PATCH /projects/:id

DELETE /projects/:id

POST /projects/:id/archive

POST /projects/:id/restore

---

# Conversations

GET /conversations

GET /conversations/:id

POST /conversations

PATCH /conversations/:id

DELETE /conversations/:id

---

# Messages

GET /messages

POST /messages

DELETE /messages/:id

---

# Providers

GET /providers

GET /providers/:id

POST /providers

PATCH /providers/:id

DELETE /providers/:id

POST /providers/:id/test

GET /providers/:id/health

---

# Models

GET /models

GET /models/:id

POST /models

PATCH /models/:id

DELETE /models/:id

---

# Prompt Library

GET /prompts

GET /prompts/:id

POST /prompts

PATCH /prompts/:id

DELETE /prompts/:id

---

# Prompt Categories

GET /prompt-categories

POST /prompt-categories

PATCH /prompt-categories/:id

DELETE /prompt-categories/:id

---

# Generated Content

GET /content

GET /content/:id

POST /content/generate

DELETE /content/:id

---

# Users

GET /users

GET /users/:id

POST /users

PATCH /users/:id

DELETE /users/:id

---

# Roles

GET /roles

GET /roles/:id

POST /roles

PATCH /roles/:id

DELETE /roles/:id

---

# Permissions

GET /permissions

GET /permissions/:id

---

# Settings

GET /settings

PATCH /settings

---

# Audit Logs

GET /audit-logs

GET /audit-logs/:id

---

# Health

GET /health

GET /health/live

GET /health/ready

---

# CRM (Sprint 1 — CRM Foundation)

Added outside the original V1.0 scope, see `docs/ARCHITECTURE.md`'s "CRM Foundation Architecture" section and `docs/architecture/decisions/ADR-0018-crm-foundation.md`.

POST /crm/leads — public, no auth, rate-limited (the Lead Form's submission target)

GET /crm/leads — requires `crm` permission

GET /crm/leads/:id — includes activities, aiAnalyses, executionLogs

PATCH /crm/leads/:id — editable contact fields only

PATCH /crm/leads/:id/status — server-enforced lifecycle transition

PATCH /crm/leads/:id/assign

POST /crm/leads/:id/notes

## CRM Automation (Sprint 2 — Automation Integration Contract)

Service-facing, `authenticateService`-gated routes under `/crm/service/*` — a static bearer token (`AUTOMATION_SERVICE_API_KEY`), never a user JWT. See `docs/ARCHITECTURE.md`'s "Sprint 2 — Automation Integration Contract" section and `docs/architecture/decisions/ADR-0019-automation-integration-contract.md`. `eyan-automation-hub` (the actual n8n workflows that would call these) is not built yet — verified this sprint via curl.

GET /crm/service/leads?email= — dedupe lookup; `data.lead` is `null` on no match (not a 404)

PATCH /crm/service/leads/:id/validation — body: `{ contractVersion, workflowExecutionId, workflowName, status: "VALIDATED" | "DISQUALIFIED", durationMs?, errorMessage? }`

PATCH /crm/service/leads/:id/qualification — body: the frozen AI JSON schema (TDD §14) plus execution metadata; writes a `LeadAiAnalysis` row and moves the lead to `AI_ANALYZED`. This sprint's own "dummy qualification response" deliverable — exercised with a stub payload, not a real AI call.

Every mutation above is idempotent on `{ workflowName, workflowExecutionId }` — a replayed call with an already-succeeded execution id is a no-op, returning the current lead state.

---

# Standard Success Response

{
  "success": true,
  "message": "Success",
  "data": {}
}

---

# Standard Error Response

{
  "success": false,
  "message": "Validation failed",
  "errors": []
}

---

# HTTP Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# Versioning Strategy

Current Version

/api/v1

Future

/api/v2

Older versions remain supported until officially deprecated.

---

# API Standards

- RESTful naming
- JSON only
- UUID identifiers
- Pagination support
- Search support
- Filtering support
- Sorting support
- Consistent validation errors
- Authentication required unless explicitly public

