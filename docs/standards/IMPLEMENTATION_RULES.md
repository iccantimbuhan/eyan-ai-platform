# EYAN AI Platform - Implementation Rules

Version: 1.0
Status: Mandatory Engineering Standards

---

# Purpose

This document defines the mandatory engineering rules for implementing features inside the EYAN AI Platform.

These rules are architectural contracts.

If implementation requires breaking any rule:

STOP.

Document the issue.

Create an ADR.

Wait for approval.

Never silently redesign the architecture.

---

# Core Principles

EYAN AI Platform is the source of truth.

Every feature must reuse the existing platform architecture.

Never introduce parallel implementations.

Prefer reuse over rebuilding.

---

# System Ownership

## EYAN AI Platform owns

- Database
- Authentication
- RBAC
- CRM
- Finance
- Dashboard
- Reporting
- Analytics
- API
- Audit Trail
- User Interface

## Automation Hub owns

- Workflow orchestration
- AI providers
- Prompt execution
- Lead scoring
- Retry logic
- Notification delivery
- External integrations

Automation never owns business data.

---

# Communication Rules

Automation Hub and EYAN communicate ONLY through authenticated HTTPS APIs.

Never use:

- Shared Database
- Shared Prisma Models
- Shared Redis
- Shared Files
- Direct SQL
- Docker networking shortcuts

Everything must go through APIs.

---

# Backend Rules

Controllers MUST NEVER:

- Access Prisma
- Contain business logic
- Call AI providers
- Call Automation Hub
- Build SQL

Controllers only:

- Validate
- Call Services
- Return responses

Services own:

- Business rules
- Domain logic
- State transitions

Repositories own:

- Database access only

Prisma is accessed ONLY inside repositories.

---

# Frontend Rules

Frontend MUST NEVER:

- Call n8n
- Call Ollama
- Call OpenAI
- Call Gemini
- Call Claude

Everything goes through backend APIs.

Reuse existing:

- Layouts
- Cards
- Dialogs
- Forms
- Tables
- Charts
- Sidebar
- Typography
- Spacing
- Loading states
- Error states

Never create duplicate UI patterns.

---

# AI Rules

AI is advisory.

AI is never authoritative.

Every AI response must include:

- Provider
- Model
- Prompt Version
- Confidence

Every response must validate against schema.

If validation fails:

Retry.

If retries fail:

Route to Human Review.

Never silently ignore failures.

---

# Lead Lifecycle Rules

Every status transition must be validated.

Every status change creates:

LeadActivity

Every automated action creates:

WorkflowExecutionLog

Nothing changes silently.

---

# Security Rules

Validate every request.

Public endpoints require:

- Validation
- Rate limiting
- Sanitization

Service endpoints require:

AUTOMATION_SERVICE_API_KEY

Webhooks require:

AUTOMATION_WEBHOOK_SIGNING_SECRET

Never:

- Hardcode secrets
- Log secrets
- Commit secrets

---

# Logging Rules

Every automation execution is logged.

Every AI execution is logged.

Every retry is logged.

Every failure is logged.

Every manual review is logged.

---

# Testing Rules

Every feature requires:

- Backend tests
- Frontend tests
- Repository tests
- Service tests
- Controller tests
- Validation tests
- Permission tests

Implementation is incomplete until tests pass.

---

# Documentation Rules

Every completed feature updates:

- Architecture
- Database
- API
- UI
- ADR
- Roadmap
- Developer Notes

Documentation is part of implementation.

---

# Code Quality Rules

Never duplicate logic.

Never duplicate validation.

Never duplicate components.

Never leave TODO comments.

Never leave placeholder implementations.

Never commit dead code.

Never disable lint rules.

Always follow existing project conventions.

---

# Git Rules

Each sprint must be independently releasable.

Each sprint ends with:

- Passing tests
- Clean build
- Clean lint
- Updated documentation

Do not begin the next sprint until approval.

---

# Definition of Done

A feature is complete only when:

- Code is implemented
- Tests pass
- Documentation is updated
- Lint passes
- Build succeeds
- Architecture remains unchanged

---

# Final Rule

If implementation conflicts with this document:

STOP.

Create an ADR.

Explain the issue.

Wait for approval.

Architecture comes first.

Implementation follows architecture.
