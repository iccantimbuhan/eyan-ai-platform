import { Router, type Router as ExpressRouter } from "express";

import { UsersController } from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router: ExpressRouter = Router();

router.use((req, _res, next) => {
  console.log("👤 Users router hit:", req.method, req.originalUrl);
  next();
});

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


console.log("✅ users.routes.ts loaded");

console.log(
  "Users routes:",
  router.stack.map((layer: any) => ({
    path: layer.route?.path,
    methods: layer.route?.methods,
  }))
);


router.post(
  "/",
  authenticate,
  requirePermission("users.create"),
  UsersController.createUser
);


export default router;
