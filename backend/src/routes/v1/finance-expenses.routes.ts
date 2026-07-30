import { Router, type Router as ExpressRouter } from "express";

import { FinanceExpenseController } from "../../controllers/finance-expense.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createExpenseValidator,
  expenseIdParamValidator,
  listExpensesValidator,
  updateExpenseValidator,
} from "../../validators/finance-expense.validator.js";

const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("finance"));

router.get("/", listExpensesValidator, validate, FinanceExpenseController.list);

router.get("/:id", expenseIdParamValidator, validate, FinanceExpenseController.getOne);

router.post("/", createExpenseValidator, validate, FinanceExpenseController.create);

router.patch(
  "/:id",
  expenseIdParamValidator,
  updateExpenseValidator,
  validate,
  FinanceExpenseController.update
);

router.delete("/:id", expenseIdParamValidator, validate, FinanceExpenseController.remove);

export default router;
