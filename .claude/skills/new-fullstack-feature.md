# Skill: New Full-Stack Feature

## Objective

Implement a complete feature while preserving the architecture of the Eyan AI Platform.

Every implementation must follow the Engineering Lifecycle and existing project conventions.

---

## Phase 1 — Understand

Before writing code:

- Understand the feature request.
- Identify affected modules.
- Check for existing implementations.
- Avoid duplicate functionality.

---

## Phase 2 — Database

If database changes are required:

- Update Prisma schema.
- Generate migrations.
- Update seed data if necessary.
- Preserve backwards compatibility.

Skip this phase if no schema changes are required.

---

## Phase 3 — Backend

Implement in this order:

1. DTO
2. Validator
3. Repository
4. Service
5. Controller
6. Route
7. Permissions
8. Tests (when available)

Never skip architecture layers.

---

## Phase 4 — Frontend

Implement in this order:

1. Types
2. API client
3. Hooks
4. Components
5. Pages
6. Routing
7. Loading states
8. Error states

Reuse existing components whenever possible.

---

## Phase 5 — Security

Verify:

- Authentication
- Authorization
- Input validation
- Error handling
- Permission checks

---

## Phase 6 — Documentation

If the feature changes architecture:

- Update repository-map.md
- Update backend.md
- Update frontend.md
- Update product.md (if applicable)

---

## Definition of Done

A feature is complete only when:

- Backend implemented
- Frontend implemented
- Validation added
- Security reviewed
- Documentation updated
- Ready for code review
