# Engineering Playbooks

Version: 1.0

---

# Purpose

This folder defines HOW engineering work is performed on this repository.

These playbooks are used by both humans and AI coding assistants.

The Product Blueprint defines WHAT to build.

The Engineering Playbooks define HOW to build it.

---

# Read Order

Before making any code changes, always read the following in order:

1. README.md
2. AGENTS.md (routes to `.context/AI_BOOTSTRAP.md` and `.context/coding-rules.md`)
3. docs/product/01_VISION.md
4. docs/product/02_ROADMAP.md
5. docs/product/03_FEATURES.md
6. Relevant engineering playbook(s)

Only then should implementation begin.

---

# Engineering Principles

Always:

- Understand before changing.
- Reuse existing architecture.
- Follow existing patterns.
- Avoid unnecessary dependencies.
- Keep implementations simple.
- Maintain backward compatibility where practical.
- Prefer consistency over cleverness.

---

# Before Writing Code

Always:

- Understand the problem.
- Locate the existing implementation.
- Check whether similar functionality already exists.
- Identify affected modules.
- Explain the implementation plan.

Do not immediately start coding.

---

# Before Finishing

Every completed task must include:

- Build passes
- Typecheck passes
- Lint passes
- Tests pass (or explain why not)
- Documentation updated if required
- No unnecessary files added
- No dead code introduced

---

# Goal

The goal is not only to produce working code.

The goal is to leave the repository cleaner, more consistent, and easier to maintain after every change.

