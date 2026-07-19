# AI Development Rules

## General

- Analyze before modifying.
- Never create files unless explicitly requested.
- Modify only the files requested.
- Preserve the existing architecture.
- Keep changes small and focused.
- Explain why a change is needed before implementing it.

---

## TypeScript

- Prefer TypeScript over JavaScript.
- Avoid using `any`.
- Use interfaces for shared models.
- Keep types close to where they are used.

---

## Backend

- Business logic belongs in services.
- Controllers should stay thin.
- Middleware handles authentication and authorization.
- Never duplicate an Express application.

---

## Frontend

- Never hash passwords.
- Never create JWTs.
- Never verify JWT signatures.
- Use services for API calls.
- Keep components focused on UI.

---

## Authentication

- Password hashing only in the backend.
- JWT signing only in the backend.
- Refresh tokens only in the backend.
- Browser stores tokens securely.
- API validates every protected request.

---

## Documentation

Every architectural change must update:

- ARCHITECTURE.md
- ROADMAP.md
- API.md

---

## AI Workflow

Think first.

Plan.

Implement.

Review.

Test.

Commit.