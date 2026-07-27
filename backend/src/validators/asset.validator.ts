import { body, param, query } from "express-validator";

import { AssetType, PublishingStatus, ReviewStatus } from "../generated/prisma/enums.js";

const ASSET_TYPES = Object.values(AssetType);
const REVIEW_STATUSES = Object.values(ReviewStatus);
const PUBLISHING_STATUSES = Object.values(PublishingStatus);
const BATCH_ACTIONS = ["approve", "reject", "delete"];
const SORT_FIELDS = ["createdAt", "updatedAt", "title"];
const SORT_DIRECTIONS = ["asc", "desc"];

export const listAssetsValidator = [
  query("projectId").trim().notEmpty().withMessage("Project ID is required."),

  query("type").optional().isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  query("status").optional().isIn(REVIEW_STATUSES).withMessage("Invalid status."),

  query("publishingStatus")
    .optional()
    .isIn(PUBLISHING_STATUSES)
    .withMessage("Invalid publishing status."),

  query("provider").optional().trim().isLength({ max: 100 }),

  query("model").optional().trim().isLength({ max: 200 }),

  query("search").optional().trim().isLength({ max: 200 }),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),

  query("sortBy").optional().isIn(SORT_FIELDS).withMessage("Invalid sortBy."),

  query("sortDir").optional().isIn(SORT_DIRECTIONS).withMessage("Invalid sortDir."),
];

export const assetParamValidator = [
  param("assetType").isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  param("sourceId").notEmpty().withMessage("Asset ID is required."),
];

export const reviewAssetValidator = [
  body("status").optional().isIn(REVIEW_STATUSES).withMessage("Invalid status."),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes must not exceed 2000 characters."),

  body("qaScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("QA score must be between 0 and 100.")
    .toInt(),

  body("checklist").optional().isArray().withMessage("Checklist must be an array."),

  body("checklist.*.category")
    .optional()
    .isIn(["content", "images", "videos"])
    .withMessage("Invalid checklist category."),

  body("checklist.*.item")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Checklist item is required."),

  body("checklist.*.result")
    .optional({ nullable: true })
    .isIn(["PASS", "FAIL", null])
    .withMessage("Checklist result must be PASS, FAIL, or null."),

  body("checklist.*.comment").optional().trim().isLength({ max: 1000 }),
];

export const batchAssetActionValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one asset must be selected."),

  body("items.*.assetType").isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  body("items.*.sourceId").notEmpty().withMessage("Asset ID is required."),

  body("action").isIn(BATCH_ACTIONS).withMessage("Invalid batch action."),
];

// Sprint 6.3 (Creative Review Workspace). A comment is a general comment
// when neither anchor is set, an annotation when one is — region and
// timestampMs are mutually exclusive, enforced below. See ADR-0009.
export const createCommentValidator = [
  body("body")
    .trim()
    .notEmpty()
    .isLength({ max: 4000 })
    .withMessage("Comment body is required and must not exceed 4000 characters."),

  body("isInternal").optional().isBoolean().withMessage("isInternal must be a boolean."),

  body("region").optional().isObject().withMessage("region must be an object."),
  body("region.x").optional().isFloat({ min: 0, max: 1 }),
  body("region.y").optional().isFloat({ min: 0, max: 1 }),
  body("region.width").optional().isFloat({ min: 0, max: 1 }),
  body("region.height").optional().isFloat({ min: 0, max: 1 }),

  body("timestampMs")
    .optional()
    .isInt({ min: 0 })
    .withMessage("timestampMs must be a non-negative integer.")
    .toInt(),

  body().custom((value: { region?: unknown; timestampMs?: unknown }) => {
    if (value.region !== undefined && value.timestampMs !== undefined) {
      throw new Error("A comment may have a region or a timestamp, not both.");
    }
    return true;
  }),
];

export const commentIdParamValidator = [
  param("assetType").isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  param("sourceId").notEmpty().withMessage("Asset ID is required."),

  param("commentId").notEmpty().withMessage("Comment ID is required."),
];

// Informational only — assigning does not grant the assignee access to the
// project. See ADR-0009.
export const assignReviewerValidator = [
  body("assigneeId").trim().notEmpty().withMessage("assigneeId is required."),

  body("note").optional().trim().isLength({ max: 500 }),
];

// Sprint 6.4 (Publishing Pipeline). platform is a URL param (see
// asset.routes.ts's PUT .../publishing/:platform), not a body field.
// Scheduling is persisted intent only — no automatic execution — so
// scheduledFor must be in the future or it wouldn't mean anything. See
// ADR-0010.
export const schedulePublishValidator = [
  param("assetType").isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  param("sourceId").notEmpty().withMessage("Asset ID is required."),

  param("platform").trim().notEmpty().withMessage("platform is required."),

  body("scheduledFor")
    .optional()
    .isISO8601()
    .withMessage("scheduledFor must be a valid ISO 8601 date.")
    .custom((value: string) => {
      if (new Date(value).getTime() <= Date.now()) {
        throw new Error("scheduledFor must be in the future.");
      }
      return true;
    }),
];

export const platformParamValidator = [
  param("assetType").isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  param("sourceId").notEmpty().withMessage("Asset ID is required."),

  param("platform").trim().notEmpty().withMessage("platform is required."),
];
