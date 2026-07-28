import { body } from "express-validator";

// The file itself is validated by videoUploadMiddleware (mimetype
// allowlist, size cap) and VideoSourceService (ffprobe) — this validator
// only covers the multipart form's text fields.
export const ingestVideoSourceValidator = [
  body("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  body("videoGroupId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Video group ID must not be empty when provided."),
];
