# AI Collaboration Framework — Version History

## v2.0 (current, since 2026-08-04)
`.context/` — a lean, single-responsibility, per-domain context system. Entry point: `AGENTS.md` → `.context/AI_BOOTSTRAP.md`. See `.context/README.md` for the maintenance rules this directory follows.

## v1.x (retired 2026-08-04)
`.claude/` — the original engineering framework (CLAUDE.md, AI_RULES.md, per-domain context, ADRs, engineering playbooks, skills, prompt templates). Fully migrated to `.context/` and `docs/` across three Documentation Optimization Sprints; the directory has been deleted. Its unique content lives on in `docs/architecture/decisions/`, `docs/engineering/`, `docs/skills/`, and `docs/prompts/`.

## Guiding principle
Improve `.context/` only when real development exposes missing guidance. Do not expand it unnecessarily — see `.context/README.md`.
