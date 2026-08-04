# Coding Rules

Single responsibility: cross-cutting engineering rules that apply no matter which module you're touching. Layer-specific rules live in `backend.md` / `frontend.md`; architecture flow lives in `architecture.md`.

## Before coding
- Understand the request, analyze existing code, reuse before creating, plan, then implement.
- Search the repo for an existing pattern before adding a new service, component, hook, or utility.
- Keep changes small — only touch files related to the task. No unrelated rewrites.

## Architecture
- Never bypass layers: Route → Validation → Auth → Controller → Service → Repository → Prisma.
- Backend specifics: `backend.md`. Frontend specifics: `frontend.md`.

## TypeScript
- No `any`. Interfaces for shared models. Keep types close to where they're used. Strict mode.
- Validate all external input with Zod. Return consistent API response shapes.

## Security
- Every change: verify authentication, authorization, input validation, permission checks.
- Password hashing, JWT signing, and JWT verification happen only in the backend — never the frontend.
- Never commit secrets. Never disable or bypass an existing security/authorization check.

## Definition of done
- Build passes, typecheck passes, lint passes, tests pass — or explain why one can't.
- If uncertain: state assumptions, explain the uncertainty, present options, recommend the safest one. Never guess on an architectural change — ask first.

## Documentation checklist
If the change is user-visible or architecture-visible, update:
- `PROJECT_STATE.md` — always, so it reflects current reality.
- `.context/current-sprint.md` — if it changes what "current" means.
- `tasks/` sprint log — if a sprint closed.
- An ADR — if a non-obvious technical decision was made. ADRs live in `docs/architecture/decisions/ADR-NNNN`.
- `CHANGELOG.md` — if a user- or API-visible change shipped.
- `PORTFOLIO.md` — only if genuinely portfolio-worthy.

## Final rule
Every change should leave the repository cleaner, more consistent, and easier to understand than before.
