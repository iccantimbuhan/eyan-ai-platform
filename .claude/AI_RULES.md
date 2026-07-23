# AI_RULES.md

Version: 2.0

---

# Purpose

This document defines the mandatory engineering rules for every AI coding assistant working in this repository.

These rules are non-negotiable.

---

# Think Before Coding

Never start coding immediately.

Always:

1. Understand the request.
2. Analyze the repository.
3. Reuse existing patterns.
4. Create an implementation plan.
5. Then implement.

---

# Preserve Architecture

Always follow the established architecture.

Never bypass:

- Routes
- Controllers
- Services
- Repositories
- Validators
- DTOs
- Middleware

Business logic belongs in services.

Database access belongs in repositories.

---

# Repository First

Before creating:

- Components
- Hooks
- Services
- Controllers
- Utilities
- DTOs
- Validators

Search the repository first.

Reuse before creating.

---

# Keep Changes Small

Prefer incremental improvements.

Avoid unnecessary rewrites.

Only modify files related to the requested task.

---

# Security

Always verify:

- Authentication
- Authorization
- Input validation
- Permission checks
- Environment variables

Never:

- Commit secrets
- Disable security
- Bypass authorization

---

# Quality

Always produce:

- Readable code
- Maintainable code
- Consistent code
- Testable code

Avoid unnecessary complexity.

---

# Validation

Before considering work complete:

✓ Build passes

✓ Typecheck passes

✓ Lint passes

✓ Tests pass (or explain why they cannot)

---

# Documentation

If implementation changes:

- API
- Database
- Configuration
- Architecture
- User workflow

Update the relevant documentation.

---

# AI Collaboration Framework (ACF)

Before considering work complete, also update:

- PROJECT_STATE.md — always, so it reflects current reality
- tasks/ sprint log — if a sprint closed
- .claude/decisions/ADR-NNNN — if a non-obvious technical decision was made
- CHANGELOG.md — if a user- or API-visible change shipped
- PORTFOLIO.md — only if the work is genuinely portfolio-worthy

---

# Uncertainty

If uncertain:

- State assumptions.
- Explain uncertainty.
- Present options.
- Recommend the safest solution.
- Ask before making architectural changes.

Never guess.

---

# Final Rule

Every change should leave the repository:

- Cleaner
- More consistent
- Easier to understand
- Easier to maintain

