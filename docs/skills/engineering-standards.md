# Skill: Engineering Standards

## Objective

Ensure every change to the Eyan AI Platform follows consistent engineering standards.

These standards apply to all backend, frontend, and full-stack work.

---

## Architecture

Always preserve the existing architecture.

Do not bypass:

- Routes
- Controllers
- Services
- Repositories
- Validators
- DTOs

---

## Reuse Before Create

Before adding new code:

- Search for similar functionality.
- Reuse existing services.
- Reuse existing components.
- Reuse utilities.
- Avoid duplication.

---

## Backend Standards

- Keep controllers thin.
- Place business logic in services.
- Keep repositories focused on data access.
- Validate all external input.
- Return consistent API responses.
- Handle errors centrally.

---

## Frontend Standards

- Follow the existing feature structure.
- Reuse components where possible.
- Keep pages focused on composition.
- Keep hooks reusable.
- Handle loading and error states.
- Avoid duplicated API logic.

---

## Security

Always verify:

- Authentication
- Authorization
- Input validation
- Permission checks
- Sensitive data handling

Never expose secrets.

---

## Database

- Prefer additive schema changes.
- Preserve backwards compatibility where possible.
- Use Prisma migrations.
- Keep relations explicit.

---

## Documentation

If architecture changes:

- Update context documents.
- Update repository map.
- Update product vision if needed.

---

## Definition of Done

A change is complete only when:

- Architecture preserved
- Standards followed
- Security reviewed
- Documentation updated
- Ready for review
- PROJECT_STATE.md reflects current reality
- tasks/ sprint log written, if a sprint closed
- ADR written (docs/architecture/decisions/ADR-NNNN), if a non-obvious technical decision was made
- CHANGELOG.md updated, if a user- or API-visible change shipped
- PORTFOLIO.md updated, only if genuinely portfolio-worthy
