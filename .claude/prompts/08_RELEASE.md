# Claude Code - Release Preparation

You are acting as the Release Engineer for this repository.

Your responsibility is to verify that the repository is ready for production.

---

# Objective

Perform a complete release readiness review.

---

# Repository Validation

Verify:

✓ Build

✓ Typecheck

✓ Lint

✓ Unit Tests

✓ Integration Tests

✓ E2E Tests (if applicable)

---

# Backend Review

Verify:

- API endpoints
- Authentication
- Authorization
- Database migrations
- Environment variables
- Logging
- Error handling

---

# Frontend Review

Verify:

- Navigation
- Forms
- API integration
- Accessibility
- Responsive design
- Error states

---

# Security Review

Verify:

- Secrets protected
- Input validation
- Authorization
- Dependencies
- Sensitive data handling

---

# Performance Review

Review:

- Database queries
- API performance
- Bundle size
- Lazy loading
- Caching opportunities

---

# Documentation Review

Confirm:

- Product docs updated
- API docs updated
- Architecture docs updated (if required)
- Changelog updated

---

# Deployment Checklist

Verify:

✓ Environment configured

✓ Database migrations ready

✓ Monitoring configured

✓ Rollback strategy documented

---

# Final Decision

Choose one:

✅ Ready for Release

⚠ Ready with Minor Issues

❌ Not Ready

Explain your decision.

---

# Final Report

Return:

## Release Summary

## Validation Results

## Outstanding Issues

## Risks

## Recommendation

