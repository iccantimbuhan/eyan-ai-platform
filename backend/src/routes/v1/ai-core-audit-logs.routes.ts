import { Router, type Router as ExpressRouter } from "express";

import { AiAuditController } from "../../controllers/ai-audit.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router: ExpressRouter = Router();

// Reuses the existing platform-wide "auditlogs" permission — same as
// Automation's own Audit Logs page, no new permission needed here.
router.get("/", authenticate, requirePermission("auditlogs"), AiAuditController.listRecent);

export default router;
