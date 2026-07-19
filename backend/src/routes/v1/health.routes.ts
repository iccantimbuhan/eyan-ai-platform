import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { HealthController } from "../../controllers/health.controller.js";

const router: ExpressRouter = Router();

router.get("/", HealthController.getHealth);

export default router;
