# CLAUDE.md
Version: 2.0

Project: Eyan AI Platform

---

# Purpose

This file is the primary entry point for any AI coding assistant working in this repository.

Before making any code changes, understand:

- The product
- The repository
- The engineering standards
- The existing implementation

Never begin implementation without first understanding the repository.

---

# Repository Mission

Eyan AI Platform is an AI-first application built to demonstrate production-quality software engineering.

Goals:

- Maintainable
- Modular
- Secure
- Testable
- Scalable
- Portfolio-quality

Every change should improve the repository.

---

# Repository Knowledge Order

Always read in this order.

1. README.md

2. .claude/CLAUDE.md

3. .claude/AI_RULES.md

4. docs/product/

- 01_VISION.md
- 02_ROADMAP.md
- 03_FEATURES.md
- 04_DATABASE.md
- 05_API.md
- 06_UI.md
- 07_MILESTONES.md
- 08_BACKLOG.md

5. .claude/engineering/

- 00_START_HERE.md
- 01_REPOSITORY_ONBOARDING.md
- 02_DEVELOPMENT_WORKFLOW.md
- 03_DEFINITION_OF_DONE.md
- 04_CODING_STANDARDS.md
- 05_FEATURE_IMPLEMENTATION.md
- 06_CODE_REVIEW.md
- 07_BUG_FIXING.md
- 08_REFACTORING.md
- 09_TESTING.md
- 10_OPERATIONS.md

Only after understanding these documents should implementation begin.

---

# Source of Truth

Priority

1. User Request

2. Product Blueprint

3. Engineering Playbooks

4. Existing Source Code

5. AI Rules

If conflicts exist:

- Explain the conflict.
- Recommend the safest solution.
- Never guess.

---

# Repository Overview

Frontend

- React
- TypeScript
- TanStack Router
- TanStack Query

Backend

- Express
- Prisma
- PostgreSQL
- JWT

Documentation

- Product Blueprint
- Engineering Playbooks

---

# Backend Architecture

Every request follows:

Route

↓

Validation

↓

Authentication

↓

Authorization

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database

Responsibilities

Controllers

- Receive requests
- Validate
- Call services
- Return responses

Services

- Business logic

Repositories

- Database access

Never bypass this architecture.

---

# Engineering Workflow

Every engineering task follows:

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

Self Review

↓

Definition of Done

Never skip steps.

---

# Before Writing Code

Always determine:

- Business goal
- Existing implementation
- Existing patterns
- Files affected
- Risks
- Testing strategy

If the change is architectural:

Explain the implementation plan before coding.

---

# Repository Philosophy

Always

✓ Reuse existing code

✓ Extend existing architecture

✓ Keep changes focused

✓ Prefer readability

✓ Keep functions small

✓ Maintain consistency

Never

✗ Rewrite unrelated code

✗ Introduce unnecessary dependencies

✗ Duplicate logic

✗ Break existing architecture

---

# Mentor Mode

When implementing features, explain:

- Why this approach?
- Which design pattern is used?
- Alternative approaches
- Trade-offs
- Security considerations
- Performance considerations
- Scalability considerations

The goal is to teach engineering, not only generate code.

---

# Completion Requirements

Every completed task must include:

## Summary

## Files Changed

## Validation

- Build
- Typecheck
- Lint
- Tests

## Documentation Updated

Includes, where applicable: PROJECT_STATE.md, tasks/ sprint log, .claude/decisions/ADR-NNNN, CHANGELOG.md, PORTFOLIO.md (only if genuinely portfolio-worthy).

## Remaining Risks

## Definition of Done

A task is complete only after validation succeeds.

