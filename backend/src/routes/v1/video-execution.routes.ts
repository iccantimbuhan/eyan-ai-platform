import { Router, type Router as ExpressRouter } from "express";

import { VideoExecutionController } from "../../controllers/video-execution.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router: ExpressRouter = Router();

router.post("/", authenticate, VideoExecutionController.execute);

export default router;
