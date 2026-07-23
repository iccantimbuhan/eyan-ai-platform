# ADR-0003 — Prefer Plain Config/Data Over Premature CRUD Infrastructure

## Context

Three separate points across Sprint 1 and Sprint 2 faced the same shape of choice: model a piece of "content-ish" data as a full database-backed, independently manageable entity, or as plain static data/config.

1. Sprint 1 — per-`ContentType` system prompts used to drive AI generation.
2. Sprint 2 — `PromptTemplate.category`, the grouping used by the Template Picker.
3. Sprint 2 — the "Custom Prompt" (write-your-own) option in the Template Picker.

## Decision

In all three cases, plain data was chosen over a new table or CRUD surface:

1. System prompts per `ContentType` live in a config map (`backend/src/config/content-prompts.ts`), not a database table.
2. `category` is a validated string on `PromptTemplate`, not a separate `PromptCategory` table with its own CRUD endpoints.
3. "Custom Prompt" is a frontend-only sentinel object, not a seeded `PromptTemplate` row.

## Alternatives Considered

A fully normalized schema in each case — a `SystemPrompt` table, a `PromptCategory` table with CRUD endpoints, a real "Custom Prompt" database row — was rejected each time because the data is fixed, small, and doesn't need independent lifecycle management (create/edit/delete by end users) today. That specific need is exactly what the deferred Prompt Library sprint (FEAT-060) is scoped to add.

## Consequences

If categories or system prompts ever need to become user-editable (as part of Prompt Library), each of these will need a real migration and CRUD surface at that point. This is accepted, deferred complexity — not avoided complexity. Until then, the simpler representation is easier to read, seed, and reason about, and doesn't force a CRUD API into existence before there's a real user-facing need for one.
