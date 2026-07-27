# PROJECT_CONTEXT

## Overview

Welcome to the Eyan AI Platform.

This repository is an AI-first engineering project designed with clean architecture, modular development, and AI-assisted engineering in mind.

Before making any changes, understand the project goals, architecture, and engineering standards.

---

## Read These Files First

1. PROJECT_STATE.md — current sprint, status, next task (start here)
2. .claude/CLAUDE.md
3. .claude/AI_RULES.md
4. .claude/context/product.md
5. .claude/context/repository-map.md
6. .claude/context/backend.md
7. .claude/context/frontend.md
8. .claude/workflows/engineering-lifecycle.md

---

## Core Skills

Use these skills when performing work:

- new-backend-feature
- new-fullstack-feature
- bug-fix
- engineering-standards

---

## Engineering Principles

- Preserve the existing architecture.
- Reuse existing code before creating new code.
- Keep controllers thin.
- Place business logic in services.
- Keep repositories focused on data access.
- Validate all external input.
- Review security before merging changes.
- Update documentation when architecture changes.

---

## Product Goal

The Eyan AI Platform is a self-hosted AI workspace for managing AI providers, projects, prompts, content generation, and future AI agents.

Every feature should support this long-term vision.

---

## Development Workflow

Understand Request
↓

Analyze Existing Code
↓

Plan
↓

Implement
↓

Review
↓

Update Documentation

---

## Definition of Done

A task is complete only when:

- Architecture is preserved.
- Code follows engineering standards.
- Security is reviewed.
- Documentation is updated if required.
- The implementation is ready for review.
- PROJECT_STATE.md reflects current reality.
- tasks/ sprint log written, if a sprint closed.
- ADR written (.claude/decisions/ADR-NNNN), if a non-obvious technical decision was made.
- CHANGELOG.md updated, if a user- or API-visible change shipped.
- PORTFOLIO.md updated, only if the work is genuinely portfolio-worthy.
