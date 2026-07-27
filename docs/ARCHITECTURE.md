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
 ┌──────┼──────────┬──────────────┬──────────────────┐
 │      │          │              │                  │
Fake  Gemini    ComfyUI     HuggingFace         (OpenAI/Stability/
      (real,    (real,      (real, hosted —      FLUX — planned)
       hosted —  self-       Sprint 4.4)
       Sprint    hosted —
       4.2       Sprint 4.3)
       Phase 1)
```

- `ImageProvider` — one method, `generate()`, returns image bytes. Never touches storage or the database.
- `ImageProviderFactory` — a registry (`register()` / `create()`), not a single-provider switch like `ProviderFactory`. Adding a provider is one new class plus one `register()` call; `ImageService`, routes, and validators never change.
- `StorageProvider` — persists bytes a provider produced (`LocalDiskStorageProvider` today). Fully independent of which `ImageProvider` produced them.
- `ImageService` — the only orchestrator. Calls a provider for bytes, calls storage to persist them, calls the repository to record metadata. Never knows which concrete provider or storage backend it's using.

Each real provider (`GeminiImageProvider`, `ComfyUIProvider`, `HuggingFaceProvider`, and later OpenAI/Stability/FLUX) also documents its own limitations against the shared `GenerateImageRequest`/`GenerateImageResponse` contract where a vendor doesn't support a field 1:1 (e.g. arbitrary width/height, negative prompts) — see each provider's own file and the sprint log that introduced it.

`ComfyUIProvider` (Sprint 4.3) is the first provider whose generation is asynchronous on the provider's own side — it submits a workflow, then polls for completion, rather than returning in a single HTTP round trip like Gemini. That asynchrony is fully contained inside the provider; `ImageService.generate()` still just calls `provider.generate()` and awaits one `Promise`, unaware that a submit-then-poll loop is happening underneath. It's also the first provider driven by an external, user-authored template (a JSON workflow graph, not backend code) rather than a hardcoded request mapping — see [COMFYUI_PROVIDER.md](COMFYUI_PROVIDER.md) for the workflow-template system this depends on.

`HuggingFaceProvider` (Sprint 4.4) is a third real provider, closer in shape to `GeminiImageProvider` (a single request/response round trip) than to `ComfyUIProvider`'s submit-then-poll. It's the first provider whose *health check* genuinely validates three independent things over the network — reachability, token validity, and model availability/permission — none of which touch the inference API itself (both calls it makes are free Hub metadata lookups), satisfying "a health check must not generate an image" while still being a real, live check rather than just a config-shape check. Both `ComfyUIProvider` and `HuggingFaceProvider` needed a random seed with no field for it in the shared `GenerateImageRequest` contract — factored into one shared `random-seed.util.ts` once the second provider needed the exact same one-line implementation, rather than duplicating it.

Generation itself goes through Hugging Face's official `@huggingface/inference` SDK (not a hand-rolled REST call — see [HUGGINGFACE_PROVIDER.md](HUGGINGFACE_PROVIDER.md#provider-migration) for why: Hugging Face's `hf-inference` provider dropped support for this provider's configured model outright, and each Inference Providers partner has its own bespoke request/response shape only the official SDK normalizes). `HUGGINGFACE_PROVIDER` (default `"auto"`) is passed straight through to the SDK, letting Hugging Face's own router pick whichever partner currently serves the configured model — `HuggingFaceProvider` itself never assumes a specific one.

---

# Asset Library & QA Architecture

Sprint 5 adds a management layer over what Content Studio already generates — an Asset Library (search/filter/batch-act) and a QA review workflow (Draft → Needs Review → Approved/Rejected → Published) — spanning three independent sources (`GeneratedContent`, `GeneratedImage`, project-scoped `SavedPrompt`) without redesigning any of them.

```
GET /assets  ──►  AssetService.list()
                       │
       ┌───────────────┼────────────────────┐
       │                │                    │
ContentRepository  ImageRepository   SavedPromptRepository
  (unchanged)         (unchanged)      (.projectId added)
       │                │                    │
       └───────────────┬────────────────────┘
                        ▼
              asset.mapper.ts (per-type mapping
              to one common AssetSummaryDto)
                        │
                        ▼
        merge review status (AssetReview, new)
        + version number (AssetVersion, new)
                        │
             search / filter / sort / paginate
                    (in application code)
```

`AssetReview` and `AssetVersion` are new, purely additive tables, both keyed on `(assetType, sourceId)` rather than a foreign key into a unified table — no such table exists, and none was introduced. An asset with no `AssetReview` row is implicitly `DRAFT`; one with no `AssetVersion` row is implicitly version 1. Neither row is created until an asset is actually reviewed or regenerated. `AssetType`'s first five values mirror `ContentType` exactly, plus `IMAGE` and `PROMPT_TEMPLATE` — the two other real sources this sprint aggregates.

Generation itself is completely untouched: `AssetService.regenerate()`/`.duplicate()` call `ContentService.generate()`/`ImageService.generate()` unchanged, then link the resulting row into `AssetVersion` (regenerate) or don't (duplicate — an independent asset, not a new version). The one exception is `generationTimeMs`, a new nullable column on both `GeneratedContent` and `GeneratedImage`, captured by timing the existing provider call — needed because Asset Details displays generation time and it can't be reconstructed after the fact.

Full design rationale, the "why not a unified Asset table" reasoning, and the exact recipe for adding a future asset type: `docs/ASSET_LIBRARY.md` and `.claude/decisions/ADR-0008-asset-library-polymorphic-review-versioning.md`.

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