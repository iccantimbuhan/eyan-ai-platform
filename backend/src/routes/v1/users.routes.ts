import { Router, type Router as ExpressRouter } from "express";

import { UsersController } from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createUserValidator,
  userIdParamValidator,
  updateUserValidator,
} from "../../validators/users.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  requirePermission("users.read"),
  UsersController.getUsers
);

router.get(
  "/:id",
  authenticate,
  requirePermission("users.read"),
  userIdParamValidator,
  validate,
  UsersController.getUser
);

router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  createUserValidator,
  validate,
  UsersController.createUser
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("users.update"),
  userIdParamValidator,
  updateUserValidator,
  validate,
  UsersController.updateUser
);

export default router;
