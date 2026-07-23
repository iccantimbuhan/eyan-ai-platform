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
- AI provider requests now use a request timeout instead of hanging indefinitely on a stuck generation — raised from 180s to 300s after production traffic showed a cold model load (the first request after a deploy or restart) can exceed 180s on our current hardware.
- Generation History entries longer than a preview length now collapse behind a "Read more" toggle instead of always showing the full response, so the history stays easy to browse as it grows.
- The deployment script (`deploy.sh`) now automatically warms the configured Ollama model right after the post-deploy health check passes, so the first real user request after a deploy never hits a cold model load. Fails the deploy with a clear error if the warm-up itself fails.
- The production reverse proxy's `/api/` route now allows up to 330s for a response (previously nginx's unconfigured 60s default), matching the backend's own AI provider timeout with a safety margin, so long-running generations no longer receive a false `504 Gateway Time-out` from nginx while the backend is still working.

### Fixed

- `POST /chat` was failing on every call in production due to a misconfigured, non-existent model — now works correctly.
- Reselecting the currently-selected template in the content generation form no longer clears the values you'd already typed into its fields.
- Content generation on a project page no longer reports "Generation Failed" for responses that take longer than 30 seconds to produce — the generate request now waits as long as the backend does, instead of the app-wide default timeout cutting it off early while the backend keeps working and saves the content anyway.
- The project workspace page (generate content, view output, browse history) now uses the same page layout, width, and header as the rest of the app, instead of rendering full-width with no page header.
- Deleting a generated content entry from Generation History now asks for confirmation first, instead of deleting immediately on click.
- **Production incident**: content generation on longer prompts intermittently failed with a `503` from the backend or a `504` from nginx, even though generation actually succeeded and saved — caused by a chain of three independently-configured timeouts (frontend, backend AI provider, and an unconfigured nginx default) that were never reconciled against real generation time or against each other. All three are now aligned; see `tasks/completed/sprint-3-prompt-library.md` for the full incident record.

### Accessibility

- Loading states in the content generation form (template list, generation history, and the "generating..." state) are now announced to screen readers instead of being purely visual.
