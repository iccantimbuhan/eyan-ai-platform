# Foundation Sprint — AI Collaboration Framework (ACF), Stage 1

Status: Completed

## Goal

Design and implement a repository-first engineering workflow so development can continue seamlessly between Claude Code, ChatGPT, Codex, Gemini, future AI assistants, and human developers — without relying on chat history. The repository itself becomes the single source of truth. Stage 1 is documentation and workflow only; automation is explicitly deferred to a future Stage 2.

## Scope

### In Scope

Planning (vision, principles, folder structure, required documents, standard workflow, AI handoff workflow, human onboarding, DoD integration, framework integration, documentation maintenance strategy, Stage 2 opportunities, risks, acceptance criteria, phased implementation plan), then implementing that plan in 5 reviewable phases: current-state/changelog documents, sprint-log backfill, decision-record backfill, framework integration, dry-run verification.

### Out of Scope

Any Stage 2 automation — scripts, CLI tools, Git hooks, or AI-driven generation of these documents. Redesigning the existing engineering framework (`.claude/`) — ACF extends it, it doesn't replace it.

## What Shipped

**Design (2 passes)**: an initial 14-section design, then a revision pass that renamed the central document (`PROJECT_STATUS.md` → `PROJECT_STATE.md`), cancelled two planned files (`ROADMAP.md`, `ARCHITECTURE.md`) after discovering they'd duplicate `docs/product/02_ROADMAP.md` and `.claude/context/repository-map.md`, adopted `ADR-NNNN` naming, added a Session End Checklist, and made Portfolio updates conditional rather than mandatory.

**Implementation (5 phases)**:
- Phase 1 — `PROJECT_STATE.md` and `CHANGELOG.md` created, current-state only, no backfill.
- Phase 2 — `tasks/` backfilled with Sprint 1, 1.1, and 2 sprint logs; `CHANGELOG.md`'s `[Unreleased]` section populated. Discovered `tasks/` already had `active/`/`completed/`/`backlog/`/`templates/` subfolders (empty, unused) and adapted to that structure instead of the flat layout originally sketched.
- Phase 3 — `docs/architecture/decisions/` backfilled with 5 ADRs, resolving all forward-references left in the Phase 2 sprint logs; one numbering collision caught and fixed before writing (two different decisions had both been provisionally labeled "ADR-0001" in separate sprint logs).
- Phase 4 — `.claude/context/repository-map.md` refreshed (AI Providers, Deployment, current domains); `PROJECT_STATE.md` added as the first "Read First" entry in `AGENTS.md`/`PROJECT_CONTEXT.md`; `FRAMEWORK_VERSION.md` bumped to 1.1.0; the ACF checklist added to all six DoD-bearing documents; `PORTFOLIO.md` created.
- Phase 5 — dry-run onboarding test performed; found and fixed one real scalability flaw (see Decisions Made).

## Files Created / Modified

**Created**: `PROJECT_STATE.md`, `CHANGELOG.md`, `PORTFOLIO.md`, `tasks/templates/sprint-log-template.md`, 3 sprint logs (`sprint-01-content-generation-mvp.md`, `sprint-1-1-ai-infra-optimization.md`, `sprint-2-templates-and-picker.md`), 5 ADRs (`ADR-0001` through `ADR-0005`), this sprint log.
**Modified**: `.claude/context/repository-map.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `FRAMEWORK_VERSION.md`, `docs/engineering/03_DEFINITION_OF_DONE.md`, `.claude/CLAUDE.md`, `.claude/AI_RULES.md`, `.claude/workflows/engineering-lifecycle.md`, `docs/skills/engineering-standards.md`.

## Database Changes

None.

## API Changes

None. This sprint is pure engineering-process documentation — no user- or API-visible change shipped, which is why `CHANGELOG.md` has no entry for it. This is a real (not hypothetical) test of the "CHANGELOG only when user/API-visible" rule from ADR-adjacent DoD design, and it holds.

## Validation

- Build: N/A — no code changed
- Typecheck: N/A — no code changed
- Lint: N/A — no code changed
- Tests: N/A — no code changed
- Dry-run onboarding test (Phase 5): reading only `AGENTS.md` → `PROJECT_STATE.md`, plus one or two follow-up pointer links, answers current sprint, status, completed work, pending work, architecture, decisions, and next task within an estimated 5-7 minutes — under the 10-minute target with margin.

## Decisions Made

- Renamed the central current-state document from `PROJECT_STATUS.md` to `PROJECT_STATE.md` — pairs naturally with `PROJECT_CONTEXT.md`, and "state" better conveys "overwritten snapshot" than "status," which invites log-like updates.
- Cancelled planned `ROADMAP.md` and `ARCHITECTURE.md` files after discovering `docs/product/02_ROADMAP.md` and `.claude/context/repository-map.md` already served those purposes — extended the existing docs instead of duplicating them.
- `PROJECT_STATE.md`'s "Pointers" section must never enumerate individual historical filenames — found during the Phase 5 dry run that the original "Completed sprints" bullet listed each sprint by name, which doesn't scale (would become an unbounded list by sprint 20, recreating the exact history-in-current-state problem ACF was designed to prevent). Fixed to point at the `tasks/completed/` folder generically, naming only the most recent entry.

## Follow-ups for Future Sprints

- Stage 2 (automation) remains explicitly deferred — auto-drafting `PROJECT_STATE.md` from git log, auto-appending `CHANGELOG.md` from commits, auto-generating `PORTFOLIO.md` entries, a CI check for missing `tasks/` entries. None of this was designed in detail, only listed as future opportunity.
- `CONTRIBUTING.md` and `DEVELOPMENT.md` remain incomplete (flagged during ACF planning, not fixed — out of scope for this sprint).
- Resume Sprint 2 at Phase 3.
