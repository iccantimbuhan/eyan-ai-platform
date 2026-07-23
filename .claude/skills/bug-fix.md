# Skill: Bug Fix

## Objective

Identify, reproduce, and resolve bugs while preserving the architecture of the Eyan AI Platform.

Never apply fixes without first understanding the root cause.

---

## Phase 1 — Understand the Issue

Gather:

- Error message
- Stack trace
- Logs
- User actions
- Expected behavior
- Actual behavior

---

## Phase 2 — Reproduce

Before changing code:

- Reproduce consistently.
- Identify affected module.
- Determine scope.

Do not guess.

---

## Phase 3 — Root Cause Analysis

Determine whether the issue is caused by:

- Database
- API
- Authentication
- Authorization
- Validation
- Business Logic
- Frontend State
- Network
- External Provider

Fix the cause, not the symptom.

---

## Phase 4 — Implement Fix

Make the smallest safe change.

Avoid unrelated refactoring.

Maintain architecture.

---

## Phase 5 — Verify

Confirm:

- Original issue resolved
- No regressions
- Permissions still correct
- Validation still works
- UI behaves correctly

---

## Phase 6 — Documentation

If the fix changes architecture or behavior:

- Update relevant context files.

---

## Definition of Done

- Root cause identified
- Fix implemented
- Verified
- No regressions
- Ready for review
