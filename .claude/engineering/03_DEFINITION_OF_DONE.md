# Definition of Done (DoD)

Version: 1.0

---

# Purpose

This document defines the minimum quality standard required before any engineering task is considered complete.

A task is NOT considered done simply because the code works.

It must satisfy all applicable requirements below.

---

# General Requirements

Every completed task must:

✓ Meet the original requirements

✓ Follow existing architecture

✓ Follow coding standards

✓ Avoid unnecessary complexity

✓ Avoid duplicated code

✓ Maintain readability

---

# Repository Quality

Before completion verify:

✓ Project builds successfully

✓ Type checking passes

✓ Lint passes

✓ Existing tests continue to pass

✓ New tests added where appropriate

✓ No unnecessary warnings

---

# Backend Requirements

When backend code changes:

✓ Routes follow project conventions

✓ Controllers remain lightweight

✓ Business logic belongs in services

✓ Validation is implemented

✓ Error handling is consistent

✓ Authentication respected

✓ Authorization verified

✓ Logging appropriate

---

# Frontend Requirements

When frontend code changes:

✓ Responsive layout maintained

✓ Loading states implemented

✓ Error states implemented

✓ Empty states implemented

✓ Accessibility considered

✓ Existing design system followed

✓ Reusable components preferred

✓ No unnecessary re-renders introduced

---

# Database Requirements

When database changes:

✓ Migration reviewed

✓ Schema documented

✓ Relationships verified

✓ Indexes considered

✓ Soft delete respected

✓ No destructive changes without approval

---

# API Requirements

When API changes:

✓ REST conventions followed

✓ Response format consistent

✓ Validation implemented

✓ Error responses standardized

✓ Authentication enforced

✓ Authorization enforced

✓ API documentation updated

---

# Security Requirements

Verify:

✓ No secrets committed

✓ Environment variables used correctly

✓ Input validation present

✓ SQL injection prevented

✓ XSS considered

✓ Authorization verified

✓ Sensitive data protected

---

# Performance Requirements

Verify:

✓ No unnecessary database queries

✓ No unnecessary API calls

✓ No unnecessary component renders

✓ Efficient loops

✓ Appropriate caching considered

---

# Documentation

Update documentation if needed:

- README

- Product Blueprint

- API documentation

- Database documentation

- Architecture documentation

---

# AI Collaboration Framework (ACF)

Verify:

✓ PROJECT_STATE.md reflects current reality

✓ tasks/ sprint log written, if a sprint closed

✓ ADR written (.claude/decisions/ADR-NNNN), if a non-obvious technical decision was made

✓ CHANGELOG.md updated, if a user- or API-visible change shipped

✓ PORTFOLIO.md updated, only if the work is genuinely portfolio-worthy

---

# Code Review Checklist

Before marking complete:

✓ Naming is clear

✓ Logic is understandable

✓ Dead code removed

✓ Comments only where useful

✓ Files remain organized

✓ No unrelated changes included

---

# Final Verification

Before completing any task verify:

✓ Build

✓ Typecheck

✓ Lint

✓ Tests

✓ Documentation

✓ Self-review completed

---

# Completion Statement

A task is complete only when:

- It satisfies the requested functionality.
- It follows repository standards.
- It passes quality verification.
- It does not reduce maintainability.
- It leaves the repository in a better state than before.


---

# AI Feature Requirements

This checklist applies to all AI-powered features in the repository.

## AI Validation

Verify:

✓ AI inference is successfully executed using the configured provider

✓ Prompt templates produce the expected output quality

✓ Response time is acceptable for the target deployment environment

✓ AI error handling is verified (timeouts, unavailable models, invalid responses)

✓ AI requests use the existing ChatService (or approved AI Gateway when implemented)

✓ No duplicate AI provider implementations are introduced

## AI Data Validation

When AI-generated data is stored:

✓ Generated content is persisted correctly

✓ Retrieval operations are verified

✓ Update/Delete operations work correctly

✓ Database migrations (if any) are applied and verified

## AI Smoke Testing

Before completing an AI feature verify:

✓ Model loads successfully

✓ ChatService responds successfully

✓ AI endpoint returns expected output

✓ Generated content is saved successfully

✓ Generated content can be retrieved

✓ Generated content can be deleted

✓ Error scenarios are verified

## AI Documentation

When applicable:

✓ Prompt templates are documented

✓ Model configuration changes are documented

✓ Known AI limitations or environment-specific issues are recorded

