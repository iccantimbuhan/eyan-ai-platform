import { Router, type Router as ExpressRouter } from "express";

import { ImageController } from "../../controllers/image.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  imageIdParamValidator,
  listImagesValidator,
} from "../../validators/image.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listImagesValidator,
  validate,
  ImageController.getImages
);

router.get(
  "/:id",
  authenticate,
  imageIdParamValidator,
  validate,
  ImageController.getImage
);

router.delete(
  "/:id",
  authenticate,
  imageIdParamValidator,
  validate,
  ImageController.deleteImage
);

export default router;
