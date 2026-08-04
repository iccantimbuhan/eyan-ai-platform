# Feature Implementation Playbook

Version: 1.0

---

# Purpose

This playbook defines the mandatory process for implementing new features.

Every feature must follow this workflow to maintain consistency, quality, and long-term maintainability.

---

# Core Principle

Never start by writing code.

Always:

Understand

↓

Analyze

↓

Plan

↓

Implement

↓

Validate

↓

Review

↓

Document

---

# Step 1 — Understand the Request

Before doing anything:

Identify:

- Business goal
- User problem
- Expected outcome
- Success criteria

Questions

- What is the feature?
- Why is it needed?
- Who benefits?
- Which milestone does it belong to?

---

# Step 2 — Read Documentation

Review:

- Product Vision
- Roadmap
- Features
- Database
- API
- UI

Read any additional documentation related to the requested feature.

---

# Step 3 — Analyze Existing Code

Search for:

- Similar features
- Existing components
- Existing services
- Existing routes
- Existing controllers
- Existing DTOs
- Existing hooks
- Existing utilities

Reuse existing implementations whenever possible.

Never duplicate functionality.

---

# Step 4 — Create an Implementation Plan

Before writing code, provide:

## Summary

Describe the solution.

## Files

List files expected to change.

## Database Impact

Will schema change?

Migration required?

## API Impact

New endpoints?

Modified endpoints?

## Frontend Impact

Pages?

Components?

Hooks?

## Risks

Potential regressions.

## Testing Strategy

How will success be verified?

Wait for approval if the change is large or architectural.

---

# Step 5 — Implement

Implementation Rules

- Follow repository conventions.
- Keep commits focused.
- Prefer extending existing code.
- Avoid introducing new dependencies.
- Keep functions small.
- Keep code readable.
- Write clear error handling.

---

# Step 6 — Validate

Verify:

✓ Build passes

✓ Typecheck passes

✓ Lint passes

✓ Tests pass

✓ No console errors

✓ No regressions observed

---

# Step 7 — Review

Perform a self-review.

Check:

- Readability
- Naming
- Architecture
- Security
- Performance
- Error handling
- Consistency

Refactor before completing if necessary.

---

# Step 8 — Documentation

Update documentation if required.

Examples:

- README
- Product Blueprint
- API Documentation
- Database Documentation
- Architecture Notes

---

# Step 9 — Completion Report

At the end of every feature provide:

## Summary

What was implemented?

## Files Changed

List all modified files.

## Validation

Build

Typecheck

Lint

Tests

## Risks

Remaining known issues.

## Follow-Up

Recommended future improvements.

---

# Rules

Always

✓ Think before coding

✓ Reuse existing architecture

✓ Explain major decisions

✓ Leave the repository cleaner

Never

✗ Rewrite unrelated code

✗ Introduce unnecessary dependencies

✗ Ignore failing tests

✗ Skip validation

✗ Leave undocumented changes

---

# Goal

Every completed feature should:

- Solve the requested problem.
- Fit naturally into the existing architecture.
- Maintain repository consistency.
- Improve long-term maintainability.

