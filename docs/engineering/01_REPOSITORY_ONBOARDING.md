# Repository Onboarding

Version: 1.0

---

# Purpose

This playbook explains how an AI coding assistant should understand this repository before making any changes.

Never assume the architecture.

Always learn it first.

---

# Primary Objective

Before implementing any feature or fixing any bug, understand:

- What the project does
- How it is structured
- Which patterns already exist
- Which standards must be followed

The goal is to extend the existing architecture, not replace it.

---

# Required Reading Order

Always read these documents in order.

1. README.md
2. AGENTS.md (routes to `.context/AI_BOOTSTRAP.md` and `.context/coding-rules.md`)
3. docs/product/01_VISION.md
4. docs/product/02_ROADMAP.md
5. docs/product/03_FEATURES.md
6. docs/product/04_DATABASE.md
7. docs/product/05_API.md
8. docs/product/06_UI.md
10. docs/product/07_MILESTONES.md
11. docs/product/08_BACKLOG.md

Only after understanding these documents should implementation begin.

---

# Repository Analysis Checklist

Before changing code, identify:

## Project Structure

- Frontend
- Backend
- Shared packages
- Configuration
- Documentation

---

## Technology Stack

Identify:

- Frameworks
- Runtime
- Database
- ORM
- Package Manager
- Build System
- Testing Framework
- UI Framework

---

## Existing Architecture

Understand:

- Folder structure
- Module boundaries
- Dependency flow
- Naming conventions
- Coding patterns

Never introduce a new architecture if an existing one already works.

---

# Pattern Discovery

Before creating new code:

Search for existing:

- Components
- Services
- Controllers
- Hooks
- Utilities
- Validators
- DTOs
- Middleware

Reuse them whenever possible.

---

# Before Every Task

Answer these questions first.

1. What problem is being solved?

2. Which modules are affected?

3. Is there already similar functionality?

4. What existing patterns should be reused?

5. What documentation is relevant?

---

# Planning Requirements

Before writing code:

Provide:

- Problem summary
- Root cause (if applicable)
- Implementation plan
- Risks
- Files likely to change

Do not immediately generate code.

---

# Repository Rules

Never:

- Duplicate functionality
- Rewrite working code without reason
- Ignore existing architecture
- Introduce unnecessary dependencies
- Break backward compatibility without explanation

Always:

- Build upon existing work
- Keep changes minimal
- Keep changes understandable
- Document architectural decisions

---

# Success Criteria

A successful onboarding means the AI understands:

- The product vision
- The repository architecture
- The existing coding standards
- The implementation patterns
- The development workflow

Only then should implementation begin.

