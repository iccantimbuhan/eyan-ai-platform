# Backend Engineering Guide

## Purpose

The backend is responsible for authentication, authorization, business logic,
AI provider integration, database access, and API responses.

The backend follows a layered architecture designed for maintainability,
testability, and scalability.

---

# Technology Stack

- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Role-Based Access Control (RBAC)

---

# Request Lifecycle

Every HTTP request should follow this flow:

HTTP Request
    ↓
Route
    ↓
Validation Middleware
    ↓
Authentication Middleware
    ↓
Authorization Middleware
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

Never skip layers.

---

# Folder Responsibilities

## Routes

Responsibilities:

- Register endpoints
- Apply middleware
- Call controllers

Routes should never contain business logic.

---

## Middleware

Current middleware:

- auth.middleware.ts
- permission.middleware.ts
- role.middleware.ts
- validation.middleware.ts
- error-handler.ts

Responsibilities:

- Authentication
- Authorization
- Validation
- Error handling

Never place business logic inside middleware.

---

## Controllers

Current controllers:

- auth.controller.ts
- chat.controller.ts
- health.controller.ts
- model.controller.ts
- projects.controller.ts
- roles.controller.ts
- users.controller.ts

Responsibilities:

- Receive requests
- Validate input (through middleware)
- Call services
- Return API responses

Controllers should remain thin.

---

## Services

Current services:

- auth.service.ts
- chat.service.ts
- health.service.ts
- model.service.ts
- projects.service.ts
- roles.service.ts
- users.service.ts

Responsibilities:

- Business logic
- Workflow orchestration
- Provider coordination

Services should not directly manipulate HTTP requests or responses.

---

## Repositories

Current repositories:

- user.repository.ts
- role.repository.ts
- project.repository.ts

Responsibilities:

- Database operations
- Prisma queries
- Data persistence

Repositories should never contain business rules.

---

## Validators

Current validators:

- auth.validator.ts
- chat.validator.ts
- projects.validator.ts
- roles.validator.ts
- users.validator.ts

Responsibilities:

- Validate request payloads
- Reject invalid input before controllers execute

---

## DTOs

Current DTOs:

- auth.dto.ts
- user.dto.ts
- role.dto.ts
- project.dto.ts

DTOs define the contract between the API and the application.

---

## Providers

Provider architecture:

Provider Interface
        ↓
Provider Factory
        ↓
Ollama Provider
        ↓
Chat Service

Future providers should implement the same interface.

---

# Engineering Rules

Always:

- Keep controllers thin.
- Place business logic in services.
- Use repositories for database access.
- Validate input before processing.
- Keep modules cohesive.
- Reuse existing services where possible.

---

# Never Do

Never:

- Access Prisma directly from controllers.
- Place SQL or Prisma logic in routes.
- Duplicate business logic.
- Bypass authentication.
- Bypass authorization.
- Skip validation.
- Create circular dependencies.
- Return inconsistent API responses.

---

# Definition of Done

A backend feature is complete when:

- Route exists
- Validation exists
- Controller implemented
- Service implemented
- Repository updated (if required)
- Authorization applied
- Errors handled
- Documentation updated
- Existing architecture preserved
