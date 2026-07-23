# Refactoring Playbook

Version: 1.0

---

# Purpose

This playbook defines how existing code should be improved without changing its external behavior.

Refactoring improves maintainability, readability, and consistency.

It should never introduce new functionality.

---

# Core Principle

Improve the implementation.

Do not change the behavior.

---

# Before Refactoring

Identify:

- Why refactoring is needed
- Existing technical debt
- Existing code smells
- Risks
- Affected modules

---

# Refactoring Goals

Examples

- Reduce duplication
- Improve readability
- Improve naming
- Extract reusable code
- Simplify complex logic
- Reduce coupling
- Improve testability

---

# Safe Refactoring Rules

Always

✓ Small changes

✓ Verify after every step

✓ Preserve behavior

✓ Keep commits focused

Never

✗ Rewrite unrelated modules

✗ Introduce unnecessary abstractions

✗ Mix feature work with refactoring

---

# Validation

Verify

✓ Build

✓ Typecheck

✓ Lint

✓ Tests

✓ No behavioral changes

---

# Documentation

Update documentation only if architecture or developer workflow changes.

---

# Completion

Provide

- Summary
- Files changed
- Improvements made
- Validation results

