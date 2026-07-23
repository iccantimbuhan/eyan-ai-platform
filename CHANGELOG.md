# Changelog

All notable changes to the Eyan AI Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Entries are added when a sprint ships a user-visible or API-visible change — see `PROJECT_STATE.md` and `tasks/` for full sprint history.

---

## [Unreleased]

### Added

- Content generation within a project: generate, list, view, and delete AI-generated content (`POST /content/generate`, `GET /content`, `GET /content/:id`, `DELETE /content/:id`).
- Prompt Templates: browse default templates by category (`GET /prompt-templates`) — Blog Post, SEO Description, Facebook Post, Instagram Caption, LinkedIn Post, Product Description, Email, Cold Outreach, Meeting Summary.
- Template Picker with category and "Recent" tabs, Template Preview, and dynamic variable fields wired into the content generation form — selecting a template fills in its `{{variables}}` and pre-selects the right content type; writing a custom prompt still works exactly as before.
- The last-selected template and up to 5 recently used templates are now remembered between visits (stored locally in the browser only).
- Saved Prompts API: create, list, view, update, and delete your own personal prompts (`POST /saved-prompts`, `GET /saved-prompts`, `GET /saved-prompts/:id`, `PATCH /saved-prompts/:id`, `DELETE /saved-prompts/:id`). Each user only ever sees their own.
- Prompt Library page: browse, save, edit, and delete your own prompts. Reachable from the sidebar.
- "Reuse a Saved Prompt" in the content generation form — pick one of your saved prompts to fill in the prompt text and content type, without leaving the generator.

### Changed

- AI provider default model corrected from an unavailable `qwen2.5-coder:14b` to the installed `qwen2.5-coder:7b`.
- Maximum generated tokens is now configurable via `OLLAMA_MAX_TOKENS` (default 500) instead of unbounded.
- AI provider requests now use a request timeout instead of hanging indefinitely on a stuck generation.

### Fixed

- `POST /chat` was failing on every call in production due to a misconfigured, non-existent model — now works correctly.
- Reselecting the currently-selected template in the content generation form no longer clears the values you'd already typed into its fields.

### Accessibility

- Loading states in the content generation form (template list, generation history, and the "generating..." state) are now announced to screen readers instead of being purely visual.
