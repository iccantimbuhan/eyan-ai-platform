import { Router, type Router as ExpressRouter } from "express";

import { AutomationConnectionController } from "../../controllers/automation-connection.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  connectionIdParamValidator,
  createConnectionValidator,
  rotateConnectionCredentialsValidator,
  updateConnectionValidator,
} from "../../validators/automation-connection.validator.js";

const router: ExpressRouter = Router();

// Deliberately no GET/POST .../reveal route. AutomationConnectionService
// does expose reveal(), but per Section 13 of the approved architecture
// "raw credentials are never returned by any API response, full stop" —
// reveal() exists for internal, system-initiated use (e.g. a future real
// McpConnector connecting), never a user-facing endpoint.

// Read (redacted — the mapper never includes a raw credential) requires
// only the general "automation" permission. Any endpoint below that
// creates, mutates, or revokes a credential requires the stricter
// "automationcredentials" permission — see Section 5/13 of the approved
// architecture on why AutomationConnection gets a finer-grained gate than
// the rest of the coarse, mostly page-level RBAC model.
router.get(
  "/",
  authenticate,
  requirePermission("automation"),
  AutomationConnectionController.getConnections
);

router.get(
  "/:id",
  authenticate,
  requirePermission("automation"),
  connectionIdParamValidator,
  validate,
  AutomationConnectionController.getConnection
);

router.post(
  "/",
  authenticate,
  requirePermission("automationcredentials"),
  createConnectionValidator,
  validate,
  AutomationConnectionController.createConnection
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("automationcredentials"),
  connectionIdParamValidator,
  updateConnectionValidator,
  validate,
  AutomationConnectionController.updateConnection
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("automationcredentials"),
  connectionIdParamValidator,
  validate,
  AutomationConnectionController.deleteConnection
);

router.post(
  "/:id/rotate",
  authenticate,
  requirePermission("automationcredentials"),
  connectionIdParamValidator,
  rotateConnectionCredentialsValidator,
  validate,
  AutomationConnectionController.rotateCredentials
);

router.post(
  "/:id/enable",
  authenticate,
  requirePermission("automationcredentials"),
  connectionIdParamValidator,
  validate,
  AutomationConnectionController.enableConnection
);

router.post(
  "/:id/disable",
  authenticate,
  requirePermission("automationcredentials"),
  connectionIdParamValidator,
  validate,
  AutomationConnectionController.disableConnection
);

export default router;
