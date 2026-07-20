import { Router, type Router as ExpressRouter } from "express";
import { ChatController } from "../../controllers/chat.controller.js";

const router: ExpressRouter = Router();

router.post("/", ChatController.chat);

export default router;
