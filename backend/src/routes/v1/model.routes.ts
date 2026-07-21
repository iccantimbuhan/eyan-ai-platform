import { Router, type Router as ExpressRouter } from "express";
import { ModelController } from "../../controllers/model.controller.js";

const router: ExpressRouter = Router();

router.get("/", ModelController.getModels);

export default router;
