import { Router, type Router as ExpressRouter } from "express";

import { FinanceAutomationController } from "../../controllers/finance-automation.controller.js";

import { authenticateService } from "../../middleware/service-auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createExpenseAutomatedValidator,
  getDashboardAutomatedValidator,
} from "../../validators/finance-automation.validator.js";

// n8n-facing surface (AI Finance Inbox — ADR-0024) — every route here is
// authenticateService-gated, never authenticate/requirePermission. Mirrors
// crm-service.routes.ts's contract (ADR-0019) unchanged: one shared service
// secret, no per-caller identity.
const router: ExpressRouter = Router();

router.use(authenticateService);

router.post(
  "/expenses",
  createExpenseAutomatedValidator,
  validate,
  FinanceAutomationController.createExpense
);

router.get("/categories", FinanceAutomationController.getCategories);

router.get(
  "/dashboard",
  getDashboardAutomatedValidator,
  validate,
  FinanceAutomationController.getDashboard
);

export default router;
