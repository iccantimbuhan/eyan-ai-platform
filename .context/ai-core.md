# AI Core

## Purpose

AI Core is the centralized AI orchestration layer.

Business modules never call providers directly.

All AI execution flows through AI Core.

---

## Architecture

Business Module → Capability → Brain → Routing → Provider → Model → Prompt → Memory → MCP Tools → Structured Response

---

## Principles

Capabilities represent business tasks.

Brains represent AI configurations.

Providers represent AI vendors.

Models represent actual LLMs.

Prompts are versioned.

Routing selects the best provider/model.

---

## Current Providers

- Ollama
- OpenAI
- Anthropic
- Gemini

---

## Current Memory

NONE

Future:

- Conversation
- Vector
- RAG

---

## Current Routing

Retry

Fallback

Confidence Threshold

Provider Selection

Model Selection

Prompt Version

---

## Current Status

Phase 1

Completed

✓ AI Core database

✓ Provider registry

✓ Routing engine

✓ Capability service

✓ Brain service

✓ Playground

✓ Health monitoring

✓ Usage logging

✓ Audit logging

---

## Rollout status

Phase 1 (foundation) — complete.

Phase 3 (CRM migration) — complete. Qualification calls go through AI Core, not Ollama directly. See `crm.md`.

Phase 2 (remaining migration: Chat, Video, Content) — in progress, one call site at a time, no breaking changes. See `current-sprint.md`.

---

## Rules

Business modules invoke Capabilities.

Never invoke Providers directly.

Never invoke Models directly.

Never bypass Routing.

Brain invocation is admin-only.

