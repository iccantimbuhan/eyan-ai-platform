# Current Sprint

_Rewrite this file completely whenever `PROJECT_STATE.md`'s top entry changes. Current state only — never accumulate history here. Full history: `PROJECT_STATE.md`, then `tasks/completed/`._

**Restaurant Operations Platform — Sprint 0 (Tenancy Foundation) — COMPLETE.** Multi-tenancy foundation for the platform's first commercial module: `Organization → Restaurant → Branch`, `OrganizationMember`/`RestaurantMember`, `requireRestaurantAccess`/`requireBranchAccess`, a Module Registry (`OrganizationModule`), `GET /organizations/me`, a real `TeamSwitcher`, and a placeholder "Restaurant Operations" nav entry. No business feature exists yet — see `restaurant.md`, ADR-0025, ADR-0026. Developed and tested against an isolated dev database; production untouched pending the normal `deploy.sh` promotion.

**Also complete — Sprint 5.2 (Production Stabilization, unrelated track).** Fixed CRM AI qualification write-back to accept `"UNKNOWN"` as a legitimate value (see `crm.md`), fixed a missing `trust proxy` config, fixed a Slack/Email notification bug in the automation hub's Workflow 4.

**Next up:**
- **Restaurant Operations Sprint 1** — Restaurant/Branch admin CRUD, Menu/Categories/Ingredients/Suppliers/Recipes (master data only — see `restaurant.md`).
- **AI Core Phase 2** — migrate the remaining call sites (Chat, Video, Content) to invoke AI Core Capabilities instead of calling providers directly, one call site at a time, no breaking changes. CRM is already migrated (Phase 3 — see `ai-core.md` and `crm.md`).
