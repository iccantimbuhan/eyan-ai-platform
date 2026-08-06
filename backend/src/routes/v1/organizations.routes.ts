import { Router, type Router as ExpressRouter } from "express";

import { OrganizationController } from "../../controllers/organization.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router: ExpressRouter = Router();

// Authentication is retained; any authenticated user can read their own
// tenant context (same posture as /auth/me and roles.routes.ts) — the
// permission gate applies to specific modules, not to knowing which
// Organizations/Restaurants/Branches you belong to.
router.use(authenticate);

router.get("/me", OrganizationController.getTenantContext);

export default router;
