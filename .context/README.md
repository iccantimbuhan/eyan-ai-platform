# .context/ — Maintenance Guide

This directory is the single source of truth for AI collaboration in this repository. It replaced a legacy `.claude/` framework, fully retired as of Documentation Optimization Sprint 3 — see `PROJECT_STATE.md` / `tasks/completed/` for the migration history.

## Rules for this directory
- Start at `AI_BOOTSTRAP.md` — every other file exists to be routed to from there, not read unprompted.
- Every file has exactly one responsibility. If you're about to add architecture content to `crm.md`, it belongs in `architecture.md` instead.
- Never commit an empty file. A routing table pointing at an empty file is worse than no file at all — it silently defeats the point of this directory.
- Keep files concise. Deep, narrative detail belongs in `docs/`, with a one-line pointer left here.
- When you add or rename a file, update `AI_BOOTSTRAP.md`'s routing table in the same change.
- `current-sprint.md` should be short enough to fully rewrite every sprint. If it starts accumulating history, that history belongs in `PROJECT_STATE.md` / `tasks/completed/`, not here.
