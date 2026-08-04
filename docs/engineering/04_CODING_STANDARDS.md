# Coding Standards

Version: 1.0

---

# Purpose

This document defines the coding standards for the entire repository.

Consistency is more important than personal preference.

When existing repository conventions differ from this document, follow the repository convention unless the team intentionally decides to refactor.

---

# Core Principles

Always:

- Prefer readability.
- Prefer simplicity.
- Reuse existing patterns.
- Write maintainable code.
- Keep functions focused.
- Keep files organized.

Never:

- Introduce unnecessary complexity.
- Rewrite working code without reason.
- Duplicate business logic.
- Add dependencies without justification.

---

# Repository First

Before creating:

- Components
- Hooks
- Services
- Controllers
- DTOs
- Validators
- Middleware
- Utilities

Always search for an existing implementation.

Reuse before creating.

---

# Naming

Variables

Use descriptive names.

Example

userProfile

providerConfiguration

conversationHistory

Avoid

data

value

temp

obj

---

Functions

Function names should describe actions.

Examples

createProject()

updateProvider()

deleteConversation()

validateApiKey()

---

Classes

Use PascalCase.

Examples

UserService

ProviderController

ChatGateway

---

Files

Use repository naming conventions.

Examples

user.service.ts

provider.controller.ts

chat.routes.ts

auth.middleware.ts

---

Folders

Group by feature whenever practical.

Avoid deeply nested folders unless they improve organization.

---

# TypeScript

Always:

- Use strict typing.
- Prefer interfaces for object contracts.
- Prefer explicit return types on exported functions.
- Avoid "any".

If "any" is necessary, document why.

---

# Functions

Keep functions focused.

A function should perform one responsibility.

If a function becomes difficult to explain, consider extracting smaller functions.

---

# Error Handling

Always:

- Handle expected failures.
- Return meaningful errors.
- Log unexpected failures.
- Avoid exposing sensitive information.

Never ignore exceptions silently.

---

# Logging

Log:

- Important events
- Warnings
- Errors

Do not log:

- Passwords
- Tokens
- Secrets
- Personal information

---

# Backend Standards

Controllers

Responsibilities:

- Receive requests
- Validate input
- Call services
- Return responses

Avoid business logic inside controllers.

---

Services

Services contain business logic.

Services should:

- Be reusable
- Be testable
- Be independent from HTTP when practical

---

Database

Use:

- Repository pattern if already established.
- Prisma according to existing repository conventions.
- Transactions where appropriate.

Avoid duplicated queries.

---

# Frontend Standards

Components

Keep components focused.

Separate:

- UI
- Business logic
- Data fetching

Reuse shared components whenever possible.

---

Hooks

Use custom hooks for reusable logic.

Avoid duplicating state management.

---

State

Prefer existing repository state management.

Do not introduce a second pattern.

---

Styling

Follow the existing design system.

Avoid inline styles unless justified.

---

# API Standards

Use:

- REST conventions
- Consistent status codes
- Standard response format

Validate:

- Input
- Authorization
- Authentication

---

# Comments

Write code that is easy to understand.

Use comments only when explaining:

- Business rules
- Complex logic
- Non-obvious decisions

Avoid comments that simply repeat the code.

---

# Tests

When adding functionality:

- Update existing tests where appropriate.
- Add new tests when behavior changes.
- Avoid brittle tests.

---

# Refactoring

Before refactoring:

Confirm:

- Why the change is needed.
- Which files are affected.
- Risks involved.

Avoid unnecessary rewrites.

---

# Documentation

Update documentation whenever:

- API changes
- Database changes
- Configuration changes
- User workflow changes

---

# Final Rule

The best code in this repository is code that:

- Matches existing patterns.
- Solves the problem.
- Is easy to maintain.
- Is easy for the next engineer to understand.


---

# AI Coding Standards

These standards apply to all AI-powered features and services.

## AI Architecture

Always:

- Reuse the existing ChatService before introducing new AI services.
- Route AI requests through the existing AI abstraction.
- Keep provider-specific logic isolated from business logic.
- Keep prompt templates outside service implementations.
- Prefer configuration over hardcoded AI behavior.

Never:

- Duplicate AI provider implementations.
- Hardcode model names inside business logic.
- Mix AI orchestration with HTTP controllers.
- Introduce new provider abstractions without architectural approval.

---

## Model Management

Always:

- Use repository configuration for selecting models.
- Verify models are compatible with the deployment environment.
- Prefer models that provide stable performance on available hardware.
- Document any model configuration changes.

Avoid:

- Selecting models solely based on parameter size.
- Depending on models that exceed available system resources.

---

## Prompt Management

Always:

- Store reusable prompts in configuration or dedicated prompt files.
- Keep prompts versionable and easy to maintain.
- Reuse prompt templates whenever possible.

Avoid:

- Embedding large prompts directly inside services.
- Duplicating prompt templates across modules.

---

## AI Service Responsibilities

AI services should:

- Validate requests before inference.
- Handle provider failures gracefully.
- Return consistent response structures.
- Remain independent from HTTP when practical.
- Be reusable by multiple application modules.

---

## AI Performance

Before introducing a new AI feature consider:

- Model response time.
- Memory usage.
- CPU utilization.
- Timeout handling.
- Retry behavior where appropriate.

Optimize for reliability before adding complexity.

