# Frontend Engineering Guide

## Purpose

The frontend provides the user interface for the Eyan AI Platform.

It follows a feature-based architecture to keep the application modular,
maintainable, and scalable.

---

# Technology Stack

- React
- TypeScript
- TanStack Router
- TanStack Query
- Feature-Based Architecture

---

# High-Level Architecture

Application

↓

Feature

↓

Page

↓

Components

↓

Hooks

↓

API Layer

↓

Backend API

Each feature should be self-contained.

---

# Current Features

- Authentication
- Dashboard
- AI Chat
- Content Studio
- Users
- Roles
- Providers
- Models
- Settings
- Error Pages

---

# Feature Structure

A feature may contain:

- api/
- components/
- hooks/
- types/
- schemas/
- config/
- pages/
- utils/

Not every feature requires every folder.

---

# Responsibilities

## Components

- Render UI
- Receive props
- Delegate business logic

Components should remain focused on presentation.

---

## Hooks

Responsibilities:

- Manage state
- Coordinate UI logic
- Consume APIs

Avoid placing rendering logic inside hooks.

---

## API Layer

Responsibilities:

- Call backend endpoints
- Handle request/response mapping
- Avoid embedding API calls directly in components

---

# Engineering Rules

Always:

- Organize by feature, not by file type.
- Keep components small and reusable.
- Reuse hooks where appropriate.
- Keep API logic inside the api/ directory.
- Prefer composition over duplication.
- Use TypeScript consistently.

---

# Never Do

Never:

- Call backend APIs directly inside page components.
- Duplicate components across features.
- Place business logic inside presentation components.
- Mix unrelated feature code.
- Use shared folders without a clear reason.

---

# Definition of Done

A frontend feature is complete when:

- Feature structure is respected.
- Components are reusable.
- API layer implemented.
- Hooks implemented where needed.
- Types defined.
- Existing UI patterns followed.
- Documentation updated.
