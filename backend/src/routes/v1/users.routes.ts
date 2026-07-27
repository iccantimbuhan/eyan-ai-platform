import { Router, type Router as ExpressRouter } from "express";

import { UsersController } from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
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
  UsersController.getUsers
);

router.get(
  "/:id",
  authenticate,
  userIdParamValidator,
  validate,
  UsersController.getUser
);

router.post(
  "/",
  authenticate,
  createUserValidator,
  validate,
  UsersController.createUser
);

router.patch(
  "/:id",
  authenticate,
  userIdParamValidator,
  updateUserValidator,
  validate,
  UsersController.updateUser
);

export default router;
