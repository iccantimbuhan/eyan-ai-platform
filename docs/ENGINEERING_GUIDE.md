# Engineering Guide

This document is the engineering constitution for Eyan AI Platform. It preserves the repository's current architecture and defines how it is extended.

## 1. Project Vision

Eyan AI Platform is becoming a self-hosted **AI Content Operations Platform**. Its current React frontend, Express API, Prisma/PostgreSQL persistence, RBAC model, and AI provider boundary are the foundation for future content operations capabilities.

The platform will support:

- AI Chat
- Content Studio
- Projects
- Brand Kits
- Blog Generation
- Social Generation
- Video Scripts
- AI Video
- Thumbnail Generation
- QA
- Publishing
- Analytics

Future modules are additions to the existing platform. They must integrate with the current feature-based frontend, layered backend, sidebar navigation, RBAC permissions, and AI provider abstractions; they must not replace them.

## 2. Architecture Principles

1. Never rewrite the existing architecture when an extension fits it.
2. Extend before replacing. Preserve working routes, contracts, features, and shared primitives.
3. Keep the frontend feature-first: feature code belongs in `frontend/src/features/<feature>`.
4. Keep the backend layered: routes coordinate HTTP, controllers coordinate requests, services own business logic, repositories own persistence, and providers own external integrations.
5. Reuse existing hooks, shared components, API clients, dialogs, table utilities, validators, and error patterns before creating new ones.
6. Give each module one clear responsibility. Avoid duplicate business rules and duplicate API implementations.
7. Components render and coordinate UI. Business rules, persistence decisions, and provider calls do not belong in presentational components.
8. Controllers remain thin. They validate/receive input, invoke services, and produce API responses.
9. Services own use cases and business rules. Repositories are not service substitutes.
10. Repositories own Prisma access and persistence-oriented transactions.
11. Providers own provider-specific integration details and shield services from vendor APIs.

## 3. Frontend Standards

### Structure

Use the established frontend structure:

```text
frontend/src/
├── components/       # shared UI, layout, and data-table building blocks
├── context/          # cross-cutting UI providers
├── features/         # feature-owned components, hooks, API, schemas, types
├── hooks/            # reusable application hooks
├── lib/              # shared helpers
├── providers/        # application providers
├── routes/           # TanStack Router file routes
├── services/         # shared HTTP service
├── stores/           # Zustand application state
└── styles/           # global theme and style definitions
```

New business modules belong under `features/`. A feature may contain `api`, `components`, `config`, `hooks`, `schemas`, `services`, `types`, and local state when needed.

### Naming and components

- Use kebab-case filenames, matching current feature and route conventions.
- Export React components in PascalCase.
- Keep shared components generic and feature components within their feature.
- Reuse `components/ui` shadcn primitives and `components/data-table` utilities.
- Keep forms in React Hook Form with Zod schemas where validation is required.

### Routes and data

- Add routes through `src/routes`; follow TanStack Router file-route conventions.
- Keep authenticated pages under `_authenticated` and preserve its layout and authentication guard.
- Use TanStack Query for API reads and mutations. Use stable feature query keys and invalidate affected keys after successful mutations.
- Use the shared Axios instance in `services/api.ts`; do not create parallel HTTP clients.
- Use Zustand only for global application state such as authenticated session state. Prefer component state and React Query for local/server state.
- Continue permission-aware sidebar navigation through `useCan()` and the existing sidebar data structure.

## 4. Backend Standards

### Layer responsibilities

```text
routes → middleware/validation → controllers → services → repositories/providers
```

- Routes define URLs and compose middleware.
- Controllers receive Express requests and return `ApiResponse` results.
- Services implement feature behavior, orchestration, and domain checks.
- Repositories contain Prisma queries, includes, transactions, and persistence mappings.
- Providers contain external integration behavior such as Ollama API calls.
- DTOs define request/response contracts where a feature needs explicit typing.
- Validators stay in `validators/`; use the existing `express-validator` or Zod pattern appropriate to the route.
- Use middleware for authentication, authorization when enabled for a capability, validation, and centralized errors.
- Use `ApiError` subclasses and the existing error handler; do not introduce response shapes ad hoc.

New HTTP capabilities belong in `routes/v1` and must be registered in `app.ts` under `/api/v1`.

## 5. AI Standards

- All AI provider access goes through `providers/interfaces` and `ProviderFactory`.
- Provider-specific request formats, endpoints, and response normalization belong in provider implementations, not features or services.
- Services may request chat, streaming, model, or future generation capabilities through provider contracts.
- Preserve the current streaming proxy pattern for streaming responses.
- Prompt content must be managed as an explicit configuration or persisted feature concern; it must not be scattered through UI components.
- Future providers such as cloud LLMs, image/video generation, or other inference backends are added as provider implementations and selected through the provider boundary.
- Never hardcode provider-specific logic into frontend pages, controllers, or generic services.

## 6. UI Standards

- Continue using shadcn/ui primitives and the current Tailwind/theme system.
- Continue using TanStack Router, Query, and Table where their existing patterns apply.
- Preserve the authenticated layout, header, sidebar, data-table style, dialogs, responsive behavior, and dark-mode compatibility.
- Do not redesign an existing interface without a product reason and a scoped implementation plan.
- Reuse dialogs, confirmation patterns, table toolbars, pagination, badges, and form controls before adding alternatives.

## 7. Feature Development Workflow

Every feature follows this order:

```text
Plan
  ↓
Architecture
  ↓
UI
  ↓
Backend
  ↓
Testing
  ↓
Documentation
  ↓
Commit
```

Plan the scope and affected modules first. Identify the existing feature, components, APIs, routes, permissions, and persistence patterns to reuse. Implement only the layers needed by the feature, verify builds and relevant tests, document contracts and operational changes, then create a focused commit.

## 8. Git Standards

- Use focused branches based on the work item, such as `feature/content-studio`, `fix/auth-refresh`, or `docs/engineering-guide`.
- Keep commits small and intentional. Use conventional, imperative messages such as `feat: add projects module`, `fix: handle refresh failure`, or `docs: add engineering guide`.
- Do not mix unrelated refactors, formatting sweeps, generated artifacts, or feature changes in one commit.
- Before opening a pull request, verify relevant builds, tests, migrations, generated route artifacts, and documentation.
- Pull requests should state purpose, architecture impact, affected routes/APIs, schema or migration impact, verification performed, and follow-up work.

## 9. Coding Standards

- Use TypeScript for all application code. Prefer explicit DTOs and feature types at boundaries.
- Prefer `type` for unions/compositions and `interface` for stable object contracts, consistent with nearby code.
- Use descriptive PascalCase component/class names and camelCase function/variable names.
- Use existing path aliases and import ordering conventions.
- Handle expected failures with `ApiError`, validation results, and user-facing query/mutation error handling.
- Log operational errors without exposing secrets, credentials, access tokens, refresh tokens, or sensitive request contents.
- Comments explain architectural intent, constraints, or non-obvious decisions; they do not narrate obvious code.
- Avoid `any` for new code when a Prisma, DTO, provider, or feature type can express the contract.

## 10. Sprint Workflow

Every sprint record must include:

1. **Goal** — the user or platform outcome.
2. **Files** — expected new and modified files.
3. **Architecture** — layers, contracts, dependencies, routes, and permissions affected.
4. **Implementation** — scoped execution steps.
5. **Verification** — builds, tests, migrations, and manual checks.
6. **Commit** — focused commit message and scope.
7. **Next Sprint** — dependency or follow-up work, without expanding current scope.

## 11. Project Roadmap

Future work is delivered incrementally through the existing architecture:

| Sprint | Module |
|---:|---|
| 1 | Content Studio |
| 2 | Projects |
| 3 | Brand Kits |
| 4 | Blog Generator |
| 5 | Social Generator |
| 6 | Video Scripts |
| 7 | AI Video |
| 8 | Thumbnail |
| 9 | QA |
| 10 | Publishing |
| 11 | Analytics |

Each module is a new feature integrated with existing routing, UI, API, persistence, RBAC, and provider patterns as needed.

## 12. Things That Must Never Change

The following architectural decisions are preserved:

- Current TanStack Router file-based routing architecture.
- Feature-based frontend organization.
- Layered backend responsibilities.
- AI provider abstraction and provider factory boundary.
- RBAC User, Role, Permission, UserRole, and RolePermission model.
- TanStack Router.
- React Query.
- Current sidebar architecture and permission-aware filtering.

Changes may extend these foundations, but must not replace them without an explicit, separately approved architectural decision.

## Project North Star

Eyan AI Platform is not intended to become another generic AI chat application.

The platform's primary goal is to become an AI Content Operations Platform that demonstrates production-grade software engineering and AI workflow orchestration.

Every new feature must satisfy all of the following:

- Solve a real content production workflow.
- Reuse the existing platform architecture.
- Be modular and independently maintainable.
- Be portfolio-worthy.
- Be explainable during technical interviews.

When choosing between adding a new feature or improving an existing workflow, prefer improving the workflow.

## Module Maturity Levels

Every module progresses through the following stages.

Stage 1
Foundation

- Routes
- Navigation
- Placeholder pages

Stage 2
UI

- Components
- Forms
- Validation

Stage 3
Backend

- APIs
- Services
- Database

Stage 4
AI

- Generation
- Prompt Engineering
- Provider Integration

Stage 5
Production

- QA
- Error Handling
- Tests
- Performance
- Documentation

## AI Assistant Working Agreement

When AI assistants contribute to this repository, they must follow these rules.

1. Never rewrite architecture unless explicitly requested.

2. Prefer extending existing modules.

3. Generate production-ready code.

4. Provide terminal-ready commands whenever possible.

5. Avoid placeholder implementations unless the current sprint explicitly calls for a foundation.

6. Respect sprint boundaries.

7. Do not introduce unnecessary dependencies.

8. Explain architectural decisions before implementation.

9. Preserve backward compatibility.

10. Every implementation must build successfully before moving to the next sprint.