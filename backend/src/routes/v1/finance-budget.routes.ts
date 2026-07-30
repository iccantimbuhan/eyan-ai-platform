import { Router, type Router as ExpressRouter } from "express";

import { FinanceBudgetController } from "../../controllers/finance-budget.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  getBudgetValidator,
  setBudgetValidator,
} from "../../validators/finance-budget.validator.js";

const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("finance"));

router.get("/", getBudgetValidator, validate, FinanceBudgetController.get);

router.put("/", setBudgetValidator, validate, FinanceBudgetController.set);

export default router;
