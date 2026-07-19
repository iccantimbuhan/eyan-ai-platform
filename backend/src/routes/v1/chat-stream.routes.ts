import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { ChatController } from "../../controllers/chat.controller.js";

const router: ExpressRouter = Router();

router.post("/", ChatController.stream);

export default router;
