import { Router, type Router as ExpressRouter } from "express";

import { McpServerConfigController } from "../../controllers/mcp-server-config.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createMcpServerConfigValidator,
  mcpServerConfigIdParamValidator,
  updateMcpServerConfigValidator,
} from "../../validators/mcp-server-config.validator.js";

const router: ExpressRouter = Router();

// "/providers" must be registered before "/:id" — otherwise Express would
// match it as the :id param instead of this static route.
router.get(
  "/providers",
  authenticate,
  requirePermission("automation"),
  McpServerConfigController.listProviders
);

router.get(
  "/",
  authenticate,
  requirePermission("automation"),
  McpServerConfigController.getServerConfigs
);

router.get(
  "/:id",
  authenticate,
  requirePermission("automation"),
  mcpServerConfigIdParamValidator,
  validate,
  McpServerConfigController.getServerConfig
);

// McpServerConfig is platform-level infrastructure (registered by an
// admin/developer, not user-owned like AutomationConnection), so its
// mutating routes require "automationcredentials" — registering a server
// can grant broad tool access (e.g. a future Docker-socket connector), the
// same reasoning Section 5 of the approved architecture gives for
// requiring the stricter permission here.
router.post(
  "/",
  authenticate,
  requirePermission("automationcredentials"),
  createMcpServerConfigValidator,
  validate,
  McpServerConfigController.createServerConfig
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("automationcredentials"),
  mcpServerConfigIdParamValidator,
  updateMcpServerConfigValidator,
  validate,
  McpServerConfigController.updateServerConfig
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("automationcredentials"),
  mcpServerConfigIdParamValidator,
  validate,
  McpServerConfigController.deleteServerConfig
);

// Health check trigger — operational, not a config mutation, so it only
// needs the general "automation" permission.
router.post(
  "/:id/health-check",
  authenticate,
  requirePermission("automation"),
  mcpServerConfigIdParamValidator,
  validate,
  McpServerConfigController.checkHealth
);

export default router;
