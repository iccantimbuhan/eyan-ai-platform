# Skill: Create a New Backend Feature

## Objective

Implement a new backend feature that follows the Eyan AI Platform architecture.

This skill must preserve the existing architecture and coding standards.

---

# Required Architecture

Every backend feature follows this structure:

Route
    ↓
Validation
    ↓
Authentication
    ↓
Authorization
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma

Never skip layers.

---

# Before Writing Code

Always:

1. Read the existing module.
2. Check for reusable services.
3. Check for reusable repositories.
4. Check existing DTOs.
5. Check validators.
6. Preserve naming conventions.

Never create duplicate functionality.

---

# Implementation Checklist

## 1. Route

Create or update the route.

Responsibilities:

- Register endpoint
- Apply middleware
- Call controller

No business logic.

---

## 2. Validation

Create or update validator.

Validate:

- Params
- Query
- Body

Reject invalid requests before reaching the controller.

---

## 3. DTO

Create or update DTOs if required.

DTOs define the API contract.

---

## 4. Controller

Responsibilities:

- Receive request
- Call service
- Return response

Never access Prisma directly.

---

## 5. Service

Responsibilities:

- Business rules
- Workflow orchestration
- Provider integration

Services should remain framework-independent.

---

## 6. Repository

Responsibilities:

- Prisma queries
- Database persistence

Repositories should not contain business logic.

---

## 7. Authorization

Determine whether:

- Authentication is required.
- Roles are required.
- Permissions are required.

Apply the correct middleware.

---

## 8. Error Handling

- Return consistent API responses.
- Handle expected errors gracefully.
- Do not expose internal implementation details.

---

# Documentation

If a feature changes architecture or introduces a new module:

Update:

- repository-map.md
- backend.md
- api.md (if applicable)

---

# Definition of Done

A feature is complete only when:

✓ Route implemented

✓ Validation implemented

✓ DTO implemented (if needed)

✓ Controller implemented

✓ Service implemented

✓ Repository implemented (if needed)

✓ Authorization applied

✓ Errors handled

✓ Documentation updated

✓ Existing architecture preserved

---

# Never Do

Never:

- Access Prisma from controllers.
- Put business logic in routes.
- Skip validation.
- Duplicate services.
- Create inconsistent API responses.
- Break the existing architecture.
