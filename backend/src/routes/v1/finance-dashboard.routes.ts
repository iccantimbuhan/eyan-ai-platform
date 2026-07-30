import { Router, type Router as ExpressRouter } from "express";

import { FinanceDashboardController } from "../../controllers/finance-dashboard.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { getDashboardValidator } from "../../validators/finance-dashboard.validator.js";

const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("finance"));

router.get("/", getDashboardValidator, validate, FinanceDashboardController.get);

export default router;
