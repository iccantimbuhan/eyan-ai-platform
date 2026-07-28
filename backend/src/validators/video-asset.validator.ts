import { body, param, query } from "express-validator";

import { VideoAssetKind } from "../generated/prisma/enums.js";

const ALL_VIDEO_ASSET_KINDS = Object.values(VideoAssetKind);

// UPLOADED_SOURCE (Sprint 7.2.1) and EDITED_VIDEO (Sprint 7.2.3) are
// deliberately excluded from generate()'s allowed kinds — neither is ever
// created via this endpoint, which only knows how to dispatch to
// ChatService (text kinds) or ImageProviderFactory (image kinds).
// UPLOADED_SOURCE only ever comes from POST /video-edit/sources
// (VideoSourceService); EDITED_VIDEO only ever comes from
// POST /video-edit/execute (VideoExecutionEngineService). Listing/filtering
// still accepts every kind, including both.
const GENERATABLE_VIDEO_ASSET_KINDS = ALL_VIDEO_ASSET_KINDS.filter(
  (kind) => kind !== "UPLOADED_SOURCE" && kind !== "EDITED_VIDEO"
);
const IMAGE_FORMATS = ["png", "jpg", "webp"];

export const generateVideoAssetValidator = [
  body("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  body("kind")
    .trim()
    .notEmpty()
    .withMessage("Video asset kind is required.")
    .isIn(GENERATABLE_VIDEO_ASSET_KINDS)
    .withMessage("Invalid video asset kind."),

  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("Prompt is required.")
    .isLength({ max: 4000 })
    .withMessage("Prompt must not exceed 4000 characters."),

  body("videoGroupId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Video group ID must not be empty when provided."),

  body("brandKitId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Brand kit ID must not be empty when provided."),

  // Image-kind-only fields (STORYBOARD/THUMBNAIL); silently ignored for
  // text kinds by VideoAssetService, same posture as ImageService ignoring
  // negativePrompt for Gemini.
  body("provider")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Provider name must not exceed 100 characters.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Provider name may only contain letters, numbers, hyphens, and underscores."),

  body("width").optional().isInt({ min: 64, max: 2048 }).toInt(),

  body("height").optional().isInt({ min: 64, max: 2048 }).toInt(),

  body("format")
    .optional()
    .isIn(IMAGE_FORMATS)
    .withMessage("Invalid image format."),
];

export const videoAssetIdParamValidator = [
  param("id").notEmpty().withMessage("Video asset ID is required."),
];

export const listVideoAssetsValidator = [
  query("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  query("videoGroupId").optional().trim().notEmpty(),

  query("kind").optional().isIn(ALL_VIDEO_ASSET_KINDS).withMessage("Invalid video asset kind."),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
];
