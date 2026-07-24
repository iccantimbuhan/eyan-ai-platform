import { body, param, query } from "express-validator";

import { AssetType, ReviewStatus } from "../generated/prisma/enums.js";

const ASSET_TYPES = Object.values(AssetType);
const REVIEW_STATUSES = Object.values(ReviewStatus);
const BATCH_ACTIONS = ["approve", "reject", "delete"];
const SORT_FIELDS = ["createdAt", "updatedAt", "title"];
const SORT_DIRECTIONS = ["asc", "desc"];

export const listAssetsValidator = [
  query("projectId").trim().notEmpty().withMessage("Project ID is required."),

  query("type").optional().isIn(ASSET_TYPES).withMessage("Invalid asset type."),

  query("status").optional().isIn(REVIEW_STATUSES).withMessage("Invalid status."),

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
