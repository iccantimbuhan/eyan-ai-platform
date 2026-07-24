# Open Source AI Platform Architecture

Version: 1.0

---

# Overview

Open Source AI Platform is a modular AI chat application designed to support multiple Large Language Model (LLM) providers through a unified backend API.

The project follows a layered architecture that separates presentation, business logic, and AI provider integrations.

The primary goals are:

- Provider independence
- Modular architecture
- Easy feature expansion
- Clean separation of responsibilities
- Production-ready structure

---

# High-Level Architecture

```
Browser
    │
    ▼
React + Vite Frontend
    │
    ▼
API Service Layer
    │
    ▼
Express Backend API
    │
    ▼
Business Services
    │
    ▼
Provider Factory
    │
    ▼
LLM Provider
```

---

# Project Structure

```
backend/
frontend/
docs/
database/
docker/
```

---

# Frontend Architecture

The frontend follows a feature-first architecture.

```
src/

assets/
components/
config/
context/
features/
hooks/
lib/
routes/
services/
stores/
styles/
```

## Responsibilities

### features/

Contains business features.

Examples:

- AI Chat
- Authentication
- Dashboard
- Models
- Providers
- Settings
- Users

Each feature owns its own:

- components
- hooks
- configuration
- business logic

---

### components/

Reusable UI components.

No business logic should exist here.

---

### services/

Responsible for communication with the backend.

Current:

```
services/
    api.ts
```

Future:

```
services/
    api.ts
    auth.service.ts
    chat.service.ts
    model.service.ts
```

---

### stores/

Global application state.

Current:

```
auth-store.ts
```

Stores should contain UI/application state only.

Business logic belongs inside services.

---

### routes/

TanStack Router route definitions.

Protected routes should use authentication middleware and route guards.

---

# Backend Architecture

The backend follows a layered architecture.

```
Routes
    │
Controllers
    │
Services
    │
Providers
```

---

## Routes

Responsibilities:

- URL definitions
- request validation
- middleware

Current

```
health.routes.ts
chat.routes.ts
chat-stream.routes.ts
model.routes.ts
```

Future

```
auth.routes.ts
```

---

## Controllers

Controllers coordinate requests.

Responsibilities:

- receive request
- call service
- return response

Controllers should not contain business logic.

---

## Services

Business logic lives here.

Current

```
ChatService
HealthService
ModelService
```

Future

```
AuthService
```

---

## Providers

Providers abstract AI vendors.

Current

```
Ollama
```

Future

```
OpenAI
Anthropic
Gemini
OpenRouter
LM Studio
```

The rest of the application should never depend directly on a provider.

All communication happens through provider interfaces.

---

## Middleware

Current

```
error-handler.ts
```

Future

```
auth.middleware.ts
```

Middleware responsibilities:

- authentication
- authorization
- logging
- request validation

---

## Utilities

Utility modules contain reusable helpers.

Future utilities:

```
jwt.ts
password.ts
api-response.ts
```

---

# Request Flow

Chat request flow:

```
Browser

↓

API Service

↓

Express Route

↓

Controller

↓

Service

↓

Provider Factory

↓

Provider

↓

LLM

↓

Response
```

---

# Authentication Architecture

Authentication is intentionally separated from the AI modules.

Future structure:

```
Routes

↓

Auth Controller

↓

Auth Service

↓

JWT Utility

↓

Password Utility

↓

Database
```

Frontend:

```
Sign In

↓

Auth Service

↓

API

↓

Backend

↓

JWT

↓

Auth Store

↓

Protected Routes
```

---

# Provider Architecture

```
AIProvider Interface
        ▲
        │
 ┌──────┴──────────┐
 │                 │
Ollama         OpenAI
 │                 │
Anthropic      Gemini
```

Each provider must implement the same interface.

This allows switching providers without changing business logic.

---

# Image Provider Architecture

AI Image Studio (Sprint 4.1+) uses a separate provider abstraction from `AIProvider` above — image generation has no local/GPU option on this hardware, so multiple hosted providers are real, expected candidates (unlike text generation, which is deliberately single-provider).

```
ImageProvider Interface (generate(request) -> bytes)
        ▲
        │
 ┌──────┴──────────┐
 │                 │
Fake            Gemini
(deterministic,  (real, hosted —
 zero cost,       Sprint 4.2 Phase 1)
 testing only)
```

- `ImageProvider` — one method, `generate()`, returns image bytes. Never touches storage or the database.
- `ImageProviderFactory` — a registry (`register()` / `create()`), not a single-provider switch like `ProviderFactory`. Adding a provider is one new class plus one `register()` call; `ImageService`, routes, and validators never change.
- `StorageProvider` — persists bytes a provider produced (`LocalDiskStorageProvider` today). Fully independent of which `ImageProvider` produced them.
- `ImageService` — the only orchestrator. Calls a provider for bytes, calls storage to persist them, calls the repository to record metadata. Never knows which concrete provider or storage backend it's using.

Each real provider (`GeminiImageProvider`, and later OpenAI/Stability/FLUX) also documents its own limitations against the shared `GenerateImageRequest`/`GenerateImageResponse` contract where a vendor doesn't support a field 1:1 (e.g. arbitrary width/height, negative prompts) — see each provider's own file and the sprint log that introduced it.

---

# Design Principles

## Separation of Concerns

Each layer has one responsibility.

---

## Provider Independence

Business logic should never depend on a specific AI provider.

---

## Feature Isolation

Each feature owns its own UI and feature-specific logic.

---

## Thin Controllers

Controllers coordinate.

Services decide.

Providers execute.

---

## Single Responsibility

Each file should solve one problem.

---

# Planned Roadmap

Phase 1

- Repository cleanup
- Documentation
- Architecture

Phase 2

- Authentication
- JWT
- User management

Phase 3

- Conversations
- Chat history
- Streaming

Phase 4

- Multiple AI providers

Phase 5

- RAG
- Tool Calling
- Agents

Phase 6

- Production Deployment

---

# Engineering Rules

- Prefer TypeScript.
- Keep controllers thin.
- Keep business logic inside services.
- Use provider abstraction.
- Never duplicate implementations.
- Extend existing architecture instead of replacing it.