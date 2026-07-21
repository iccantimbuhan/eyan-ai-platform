import { Router } from "express";

import { AuthController } from "../../controllers/auth.controller.js";

console.log("✅ auth.routes.ts loaded");

import {
  registerValidator,
  loginValidator,
  refreshValidator,
} from "../../validators/auth.validator.js";

import { validate } from "../../middleware/validation.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  registerValidator,
  validate,
  AuthController.register
);

router.post(
  "/login",
  loginValidator,
  validate,
  AuthController.login
);

router.post(
  "/refresh",
  refreshValidator,
  validate,
  AuthController.refresh
);

router.post(
  "/logout",
  authenticate,
  AuthController.logout
);

router.get(
  "/me",
  authenticate,
  AuthController.me
);

console.log(
  "Auth routes:",
  router.stack.map((layer: any) => ({
    path: layer.route?.path,
    methods: layer.route?.methods,
  }))
);

export default router;
