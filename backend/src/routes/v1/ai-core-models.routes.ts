import { Router, type Router as ExpressRouter } from "express";

import { AiModelController } from "../../controllers/ai-model.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { aiModelIdParamValidator, createAiModelValidator, updateAiModelValidator } from "../../validators/ai-model.validator.js";

const router: ExpressRouter = Router();

router.get("/", authenticate, requirePermission("aicore"), AiModelController.list);

router.post("/", authenticate, requirePermission("aicoreadmin"), createAiModelValidator, validate, AiModelController.create);

router.get("/:id", authenticate, requirePermission("aicore"), aiModelIdParamValidator, validate, AiModelController.getById);

router.patch(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiModelIdParamValidator,
  updateAiModelValidator,
  validate,
  AiModelController.update
);

router.delete("/:id", authenticate, requirePermission("aicoreadmin"), aiModelIdParamValidator, validate, AiModelController.remove);

export default router;
