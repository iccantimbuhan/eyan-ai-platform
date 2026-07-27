# Repository Map

## Overview

Eyan AI Platform is a full-stack AI application built as a modular monorepo.

Repository structure:

frontend/
    React + TypeScript
    TanStack Router
    TanStack Query
    Feature-based architecture

backend/
    Express
    Prisma
    PostgreSQL
    JWT Authentication
    RBAC

docs/
    Human documentation

.claude/
    AI engineering documentation
    decisions/ — Architecture Decision Records (ADR-NNNN)

tasks/
    Engineering task tracking
    active/ — in-progress sprints
    completed/ — finished sprint logs
    backlog/ — not-yet-started work
    templates/ — reusable templates

---

## Backend Domains

Authentication
- Login
- JWT
- Refresh Token
- Authorization

Users
- User management
- User CRUD

Roles
- RBAC
- Permissions

Projects
- Content Studio projects

Content
- AI-generated content (`GeneratedContent`)
- Generate, list, retrieve, delete

Prompt Templates
- Default content templates (read-only catalog)
- Organized by category and content type

Images
- AI-generated images (`GeneratedImage`), owned transitively through their parent Content Studio project (no separate `userId` column — see ADR-0007)
- Generate, list, retrieve, delete
- `PENDING` / `COMPLETED` / `FAILED` lifecycle; storage cleanup on delete
- Provider abstraction (see AI Providers below); no real provider configured yet — Sprint 4.2

Chat
- AI Chat
- Streaming
- Provider abstraction

Models
- AI model management

Health
- Health checks

---

## Frontend Features

Authentication

Dashboard

AI Chat

Content Studio

Users

Roles

Providers

Models

Settings

Error Pages

---

## Architecture Flow

Client

↓

Router

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

PostgreSQL

---

## AI Providers

Current provider: Ollama — a single provider, no AI Gateway or multi-provider routing (see `ADR-0001`).

Default model: `qwen2.5-coder:7b` (see `ADR-0001`, `ADR-0002`). Configuration lives in `backend/src/config/env.ts` (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_MAX_TOKENS`).

Generation limits (max output tokens) are configurable via `OLLAMA_MAX_TOKENS`, not hardcoded — see `ADR-0002`.

All AI-powered features (Chat, Content generation) go through `ChatService`, which wraps `ProviderFactory`. `ProviderFactory` returns an `AIProvider` (currently `OllamaProvider`). No feature calls Ollama directly.

**Image generation is a separate, independent provider seam** (`ImageProvider`, distinct from `AIProvider` — different request/response shapes, and no local/GPU option exists for images at all). Unlike `ProviderFactory` (single-provider by design, ADR-0001), `ImageProviderFactory` is a real registry (`register`/`create`/`listRegistered`) since multiple hosted image providers are expected (OpenAI Images, Gemini, Stability AI, FLUX — see `tasks/backlog/sprint-4-2-provider-integration.md`). Only an internal deterministic `FakeImageProvider` is registered as of Sprint 4.1; `IMAGE_PROVIDER` is unset in production. Image bytes are persisted via a separate `StorageProvider` abstraction (currently `LocalDiskStorageProvider`; cloud storage can replace it without touching `ImageService`).

---

## Deployment

Backend runs as a systemd service: `eyan-backend.service`.

No CI/CD auto-deploy exists. Backend changes require a manual redeploy/restart of `eyan-backend.service` before they take effect in production.

Known risk: a stale deployment (old build still running in memory) has caused confusion in past sprints — verify production's `/api/v1/health` response reflects the expected model/config after deploying.

---

## Engineering Goals

- Modular
- Maintainable
- AI-friendly
- Production-ready
- Easy to extend
- Well documented
