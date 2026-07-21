# ADR-0001: Project Structure

Status:
Accepted

Date:
2026-07-21

## Context

The Eyan AI Platform is intended to become a production-grade,
self-hosted AI platform supporting:

- Multiple AI providers
- Multi-user authentication
- Organizations
- Teams
- RBAC
- API Keys
- Workflows
- Plugins
- Conversations
- Future billing
- SDK

The project requires a scalable architecture that supports future
growth while remaining easy to maintain.

## Decision

The backend will use a feature-module architecture.

```
backend/src/

config/
middleware/
providers/
modules/
shared/

app.ts
index.ts
```

Each feature owns its own:

- controller
- service
- repository
- routes
- schemas
- types

Providers are reserved for external integrations.

Repositories encapsulate database persistence.

Shared contains reusable utilities.

## Consequences

Positive

- Highly scalable
- Easier testing
- Clear ownership
- Easier onboarding
- Supports future microservice extraction

Negative

- Slightly more folders
- Requires discipline

## Alternatives Considered

- Layer-first architecture
- Clean Architecture
- Hexagonal Architecture
- NestJS modules

Feature modules were chosen because they balance simplicity and scalability.

## Notes

This ADR becomes the default backend structure.

Future changes require a new ADR.