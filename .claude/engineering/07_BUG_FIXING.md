# Bug Fixing Playbook

Version: 1.0

---

# Purpose

This playbook defines the standard process for investigating, diagnosing, and fixing bugs.

Never fix a symptom without understanding the root cause.

---

# Core Principle

Investigate first.

Fix second.

Verify third.

Document fourth.

---

# Step 1 — Understand the Bug

Collect:

- Bug description
- Expected behavior
- Actual behavior
- Error messages
- Stack traces
- Logs
- Screenshots (if available)

Questions

- What is failing?
- When did it start?
- Can it be reproduced?

---

# Step 2 — Reproduce

Always reproduce the issue before changing code.

Document:

- Steps
- Inputs
- Environment
- Frequency

If the bug cannot be reproduced, explain why before continuing.

---

# Step 3 — Root Cause Analysis

Identify:

- Which module is responsible?
- Which file introduced the issue?
- Is this a regression?
- Is configuration involved?
- Is database state involved?

Never guess.

---

# Step 4 — Impact Analysis

Determine:

- Affected users
- Affected modules
- Security impact
- Performance impact
- Database impact
- API impact

---

# Step 5 — Implementation Plan

Before writing code provide:

## Root Cause

Explain the actual cause.

## Proposed Fix

Explain the safest solution.

## Risks

List possible regressions.

## Files

List expected files to change.

---

# Step 6 — Implement

Implementation Rules

- Keep changes minimal.
- Fix the root cause.
- Avoid unrelated refactoring.
- Reuse existing architecture.
- Remove temporary debugging code.

---

# Step 7 — Validation

Verify:

✓ Bug no longer occurs

✓ Existing functionality still works

✓ Build passes

✓ Typecheck passes

✓ Lint passes

✓ Tests pass

If appropriate:

Add a regression test.

---

# Step 8 — Regression Review

Confirm:

✓ No new warnings

✓ No performance degradation

✓ No security regression

✓ No duplicated logic introduced

---

# Step 9 — Documentation

Update documentation if:

- API behavior changed
- Configuration changed
- User workflow changed
- Root cause should be documented

---

# Completion Report

Provide:

## Bug Summary

## Root Cause

## Solution

## Files Changed

## Validation Results

- Build
- Typecheck
- Lint
- Tests

## Remaining Risks

State any known limitations.

---

# Rules

Always

✓ Diagnose before coding

✓ Explain the root cause

✓ Prefer the smallest safe fix

✓ Add regression protection where appropriate

Never

✗ Guess

✗ Patch symptoms only

✗ Rewrite unrelated code

✗ Leave debugging code in production

---

# Goal

Every bug fix should make the repository more stable, more understandable, and less likely to fail again.

