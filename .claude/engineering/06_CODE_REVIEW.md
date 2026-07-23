# Code Review Playbook

Version: 1.0

---

# Purpose

This playbook defines how code reviews should be performed.

Every implementation must undergo a self-review before it is considered complete.

The objective is not only to find bugs, but to improve maintainability, consistency, and long-term quality.

---

# Review Philosophy

Review the implementation as if another engineer will maintain it for the next five years.

Review for:

- Correctness
- Readability
- Simplicity
- Maintainability
- Security
- Performance
- Consistency

---

# Step 1 — Requirements Review

Verify:

✓ The requested feature was implemented

✓ No requested functionality is missing

✓ No unrelated functionality was modified

✓ Business requirements are satisfied

---

# Step 2 — Architecture Review

Verify:

✓ Existing architecture was respected

✓ Existing patterns were reused

✓ No duplicate implementations created

✓ Responsibilities remain properly separated

✓ Controllers remain lightweight

✓ Services contain business logic

✓ Components remain focused

---

# Step 3 — Code Quality Review

Check:

✓ Naming is descriptive

✓ Functions are small

✓ Files remain organized

✓ Dead code removed

✓ No duplicated logic

✓ No unnecessary abstractions

✓ Readability improved

---

# Step 4 — TypeScript Review

Verify:

✓ Strong typing

✓ No unnecessary "any"

✓ Interfaces reused

✓ Types remain consistent

✓ Public functions have explicit return types where appropriate

---

# Step 5 — Security Review

Verify:

✓ Input validation exists

✓ Authorization enforced

✓ Authentication respected

✓ Secrets not exposed

✓ Sensitive data not logged

✓ No obvious injection risks

---

# Step 6 — Performance Review

Verify:

✓ No unnecessary database queries

✓ No unnecessary API requests

✓ No unnecessary re-renders

✓ Expensive operations minimized

✓ Existing caching respected

---

# Step 7 — Testing Review

Verify:

✓ Existing tests still pass

✓ New functionality tested when appropriate

✓ Edge cases considered

✓ Error paths considered

---

# Step 8 — Documentation Review

Verify:

✓ Documentation updated if needed

✓ API documentation updated

✓ Product documentation remains accurate

✓ Comments explain only complex logic

---

# Step 9 — Repository Health

Confirm:

✓ No temporary files

✓ No debug code

✓ No unused imports

✓ No commented-out code

✓ No unnecessary dependencies

---

# Final Review Report

Provide:

## Summary

Brief explanation of the completed work.

## Strengths

What was done well?

## Risks

Remaining concerns.

## Recommendations

Future improvements (optional).

## Validation

✓ Build

✓ Typecheck

✓ Lint

✓ Tests

---

# Final Rule

Do not approve code simply because it works.

Approve it because it improves the repository.

