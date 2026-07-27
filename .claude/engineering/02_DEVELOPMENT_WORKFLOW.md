# Development Workflow

Version: 1.0

---

# Purpose

This playbook defines the mandatory workflow for implementing any feature, fixing any bug, refactoring existing code, or performing maintenance.

Every engineering task must follow this workflow.

---

# Core Principle

Think first.

Code second.

Verify third.

Document fourth.

Never skip steps.

---

# Standard Workflow

Every task follows these phases.

1. Understand
2. Analyze
3. Plan
4. Implement
5. Validate
6. Review
7. Document
8. Complete

---

# Phase 1 — Understand

Before writing code:

- Read the task carefully.
- Understand the business goal.
- Understand the expected outcome.
- Identify affected modules.
- Review relevant documentation.

Questions to answer:

- What problem is being solved?
- Why is this change needed?
- Who is affected?

---

# Phase 2 — Analyze

Analyze the existing codebase.

Identify:

- Existing implementation
- Similar features
- Existing services
- Existing components
- Existing APIs
- Existing database models

Never assume a new implementation is required.

---

# Phase 3 — Plan

Before writing code provide:

## Summary

Explain the intended solution.

## Files

List expected files to modify.

## Risks

Identify possible side effects.

## Validation

Explain how success will be verified.

Do not begin implementation until a clear plan exists.

---

# Phase 4 — Implement

Implementation guidelines:

- Keep changes focused.
- Reuse existing code.
- Follow project conventions.
- Avoid unnecessary abstractions.
- Write readable code.
- Keep functions small.
- Avoid duplicated logic.

---

# Phase 5 — Validate

Validation checklist:

✓ Project builds

✓ Typecheck passes

✓ Lint passes

✓ Tests pass

✓ No console errors

✓ No obvious regressions

If something cannot be validated, explain why.

---

# Phase 6 — Review

Perform a self-review.

Check:

- Readability
- Maintainability
- Security
- Performance
- Consistency
- Error handling

Refactor if necessary before considering the task complete.

---

# Phase 7 — Documentation

Update documentation when needed.

Examples:

- README
- Product documentation
- API documentation
- Database documentation
- Architecture notes

Documentation should stay aligned with the implementation.

---

# Phase 8 — Completion

A task is complete only if:

- Requirements satisfied
- Build successful
- Validation successful
- Documentation updated
- Code reviewed
- No unnecessary files added

---

# Development Rules

Always:

- Explain major decisions.
- Prefer consistency over cleverness.
- Follow existing architecture.
- Minimize technical debt.
- Leave the repository cleaner than before.

Never:

- Rewrite unrelated code.
- Mix unrelated changes.
- Ignore failing tests.
- Ignore lint errors.
- Introduce breaking changes without explanation.

---

# Goal

Every completed task should improve the quality, stability, and maintainability of the repository.

