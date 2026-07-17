import { Router } from "express";
import { ModelController } from "../../controllers/model.controller.js";

const router = Router();

router.get("/", ModelController.getModels);

export default router;