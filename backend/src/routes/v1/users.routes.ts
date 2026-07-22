import { Router, type Router as ExpressRouter } from "express";

import { UsersController } from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

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
  UsersController.getUser
);

router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  UsersController.createUser
);

export default router;
