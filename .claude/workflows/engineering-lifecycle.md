# Engineering Lifecycle

## Purpose

This workflow defines the standard engineering process for all changes in the Eyan AI Platform.

Every AI assistant and contributor should follow this lifecycle before implementing changes.

---

## Step 1 — Understand the Request

Determine the type of work:

- New backend feature
- New frontend feature
- Full-stack feature
- Bug fix
- Refactor
- Performance improvement
- Security improvement
- Documentation update

Do not begin implementation until the request is understood.

---

## Step 2 — Analyze Existing Code

Before creating anything:

- Search for similar modules.
- Reuse existing services.
- Reuse components.
- Reuse repositories.
- Preserve architecture.

Avoid duplicate functionality.

---

## Step 3 — Plan

Identify:

- Files to modify
- Files to create
- Required middleware
- Database impact
- API impact
- UI impact
- Documentation impact

Create the smallest possible implementation plan.

---

## Step 4 — Implement

Follow the appropriate engineering skill:

- new-backend-feature
- new-frontend-feature
- new-fullstack-feature
- bug-fix
- refactor
- security-review

Do not skip architecture layers.

---

## Step 5 — Review

Verify:

- Architecture preserved
- Naming conventions followed
- No duplicated logic
- Error handling implemented
- Security considered
- Existing functionality unaffected

---

## Step 6 — Update Documentation

Update context files when architecture changes.

Update repository map if new modules are introduced.

---

## Step 7 — Definition of Done

A task is complete only when:

- Code implemented
- Standards followed
- Documentation updated
- Architecture preserved
- Ready for review
- PROJECT_STATE.md reflects current reality
- tasks/ sprint log written, if a sprint closed
- ADR written (.claude/decisions/ADR-NNNN), if a non-obvious technical decision was made
- CHANGELOG.md updated, if a user- or API-visible change shipped
- PORTFOLIO.md updated, only if genuinely portfolio-worthy
