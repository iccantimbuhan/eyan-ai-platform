# Sprint 1.1 — AI Infrastructure Optimization

Status: Completed

## Goal

Optimize the existing AI infrastructure so it provides a stable foundation for Content Studio and future AI-powered modules, without redesigning architecture or introducing new AI features.

## Scope

### In Scope

Review Ollama integration and `ChatService`, verify the configured model, benchmark it, recommend right-sized models for current hardware, remove configuration/code depending on oversized models, improve configuration where appropriate, verify `POST /chat` and `POST /content/generate`, run build/typecheck/lint/AI smoke tests.

### Out of Scope

AI Gateway, multi-provider routing, Prompt Library, streaming, image generation, video generation, major infrastructure changes.

## What Shipped

- **Root cause found**: `OLLAMA_MODEL` was configured to `qwen2.5-coder:14b`, a model that no longer existed on the host (only `qwen2.5-coder:7b` was installed). This made `POST /chat` fail on every call in production (`503 Unable to connect to AI provider`) and explained the unresolved hang from Sprint 1.
- Corrected the configured/fallback model to `qwen2.5-coder:7b` in `.env`, `.env.example`, and the code fallback in `config/env.ts`.
- Added a request timeout (180s) to `OllamaProvider`'s axios client so a stuck request fails predictably instead of hanging indefinitely.
- Made maximum generated tokens configurable via `OLLAMA_MAX_TOKENS` (threaded through a new `ChatOptions` type on the `AIProvider` interface and `ChatService`) instead of leaving generation length unbounded — default set to 1024 initially, then lowered to **500** after benchmark data showed longer generations exceed reasonable latency on this hardware.
- Benchmarked `qwen2.5-coder:7b` (the only viable model for this hardware — AMD EPYC, 6 vCPU, 11GB RAM, CPU-only) across multiple target output sizes.

## Files Created / Modified

`backend/.env`, `backend/.env.example`, `backend/src/config/env.ts`, `backend/src/providers/interfaces/ai-provider.ts`, `backend/src/providers/ollama/ollama.provider.ts`, `backend/src/services/chat.service.ts`. No new files.

## Database Changes

None.

## API Changes

None — same endpoints, contract unchanged. Internal provider/config behavior only.

## Validation

- Build: pass
- Typecheck: pass
- Lint: no backend lint script (pre-existing gap)
- AI smoke tests (isolated dev port, production untouched): `POST /chat` 503 → 200; `POST /content/generate` 404 (stale deploy) → 201 once tested against the corrected config
- Benchmark (warm model, direct to Ollama): 50 tokens ≈ 20s (3.14 tok/s), 100 tokens ≈ 33s (3.07 tok/s), 300 tokens ≈ 90s (3.37 tok/s), 500 tokens ≈ 163s (3.09 tok/s), 1000 tokens exceeded a 400s timeout with no response — throughput is consistently ~3.1–3.4 tok/s regardless of length, which is this hardware's real ceiling.

## Decisions Made

- Stay on a single Ollama provider; no AI Gateway or multi-provider routing. Hardware cannot reliably run anything larger than a 7B-class model. _See ADR-0001 (to be written in ACF Stage 1 Phase 3)._
- Max tokens must be configurable, not hardcoded, so different future features can use different limits without touching provider code. _See ADR-0002 (to be written in ACF Stage 1 Phase 3)._
- Async/background generation assessed as architecturally low-risk to add later (`ChatService` is already decoupled from `req`/`res`) but explicitly deferred — documented, not implemented.
- Did not touch Ollama's context length or systemd configuration this sprint, per explicit instruction — flagged as a live option for later, requires restarting a shared production service.

## Follow-ups for Future Sprints

- Production (`eyan-backend.service`) needed a real redeploy/restart to pick up both this sprint's and the prior sprint's changes — confirmed done by the start of Sprint 2.
- Async/background generation recommended as its own sprint before Content Studio adds larger content types (full articles, longer docs) — synchronous generation at ~3 tok/s will otherwise produce a poor UX for those cases.
- If sub-30s latency ever becomes a hard requirement, a 3B-class model would need its own benchmark (not evaluated this sprint).
