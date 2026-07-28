import { Router, type Router as ExpressRouter } from "express";

import { VideoSourceController } from "../../controllers/video-source.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { videoUploadMiddleware } from "../../middleware/video-upload.middleware.js";

import { ingestVideoSourceValidator } from "../../validators/video-source.validator.js";

const router: ExpressRouter = Router();

// videoUploadMiddleware runs before the validator: multer is what parses
// the multipart body into req.body/req.file in the first place, so
// express-validator has nothing to check until it's run.
router.post(
  "/",
  authenticate,
  videoUploadMiddleware,
  ingestVideoSourceValidator,
  validate,
  VideoSourceController.upload
);

export default router;
