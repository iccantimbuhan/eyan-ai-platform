# Release Preparation

Assumes the Start Session contract (`01_START_SESSION.md`) is already active. This is a readiness review, not an implementation task — Start Session's plan/approval/implementation steps do not apply; only its validation gate is extended below.

Verify the repository is ready for production.

---

## Repository Validation

Extend the Start Session Step 6 gate with:

✓ Integration Tests

✓ E2E Tests (if applicable)

---

## Backend Review

API endpoints, authentication, authorization, database migrations, environment variables, logging, error handling.

---

## Frontend Review

Navigation, forms, API integration, accessibility, responsive design, error states.

---

## Security Review

Secrets protected, input validation, authorization, dependencies, sensitive data handling.

---

## Performance Review

Database queries, API performance, bundle size, lazy loading, caching opportunities.

---

## Documentation Review

Confirm product docs, API docs, architecture docs (if required), and the changelog are updated.

---

## Deployment Checklist

✓ Environment configured

✓ Database migrations ready

✓ Monitoring configured

✓ Rollback strategy documented

---

## Final Decision

Choose one:

✅ Ready for Release

⚠ Ready with Minor Issues

❌ Not Ready

Explain your decision.

---

## Final Report

Return:

## Release Summary

## Validation Results

## Outstanding Issues

## Risks

## Recommendation
