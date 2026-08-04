# Testing Playbook

Version: 1.0

---

# Purpose

This playbook defines testing expectations for the repository.

Testing provides confidence that changes work without introducing regressions.

---

# Testing Philosophy

Every important behavior should be verifiable.

Focus on meaningful tests rather than test quantity.

---

# Types of Tests

Unit Tests

- Business logic
- Utilities
- Services

Integration Tests

- API
- Database
- Authentication

End-to-End Tests

- User flows
- Navigation
- Forms
- Authentication

---

# Before Writing Tests

Understand

- Business requirements
- Expected behavior
- Edge cases
- Error handling

---

# Test Quality

Good tests

✓ Deterministic

✓ Independent

✓ Fast

✓ Readable

✓ Maintainable

Avoid

✗ Duplicate tests

✗ Fragile tests

✗ Testing implementation details

---

# Validation

Verify

✓ Build

✓ Typecheck

✓ Lint

✓ Unit tests

✓ Integration tests

✓ E2E tests (when applicable)

---

# Regression Protection

Whenever a bug is fixed, add or update tests where appropriate to reduce the chance of the issue recurring.

---

# Completion

Provide

- Tests added
- Tests updated
- Validation summary
- Remaining limitations

