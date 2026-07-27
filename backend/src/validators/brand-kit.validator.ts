import { body, param, query } from "express-validator";

const TEXT_MAX = 2000;
const GUIDELINES_MAX = 8000;

const arrayFieldValidators = [
  body("logos").optional().isArray().withMessage("Logos must be an array."),
  body("logos.*.url")
    .if(body("logos").exists())
    .trim()
    .notEmpty()
    .withMessage("Each logo requires a url."),

  body("primaryColors")
    .optional()
    .isArray()
    .withMessage("Primary colors must be an array."),
  body("primaryColors.*.hex")
    .if(body("primaryColors").exists())
    .trim()
    .notEmpty()
    .withMessage("Each color requires a hex value."),

  body("secondaryColors")
    .optional()
    .isArray()
    .withMessage("Secondary colors must be an array."),
  body("secondaryColors.*.hex")
    .if(body("secondaryColors").exists())
    .trim()
    .notEmpty()
    .withMessage("Each color requires a hex value."),

  body("fonts").optional().isArray().withMessage("Fonts must be an array."),

  body("approvedTerminology")
    .optional()
    .isArray()
    .withMessage("Approved terminology must be an array."),

  body("restrictedWords")
    .optional()
    .isArray()
    .withMessage("Restricted words must be an array."),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean.")
    .toBoolean(),
];

const textFieldValidators = [
  body("client").optional().trim().isLength({ max: 200 }),
  body("typography").optional().trim().isLength({ max: 200 }),
  body("toneOfVoice").optional().trim().isLength({ max: TEXT_MAX }),
  body("writingStyle").optional().trim().isLength({ max: TEXT_MAX }),
  body("audience").optional().trim().isLength({ max: TEXT_MAX }),
  body("ctaStyle").optional().trim().isLength({ max: TEXT_MAX }),
  body("brandGuidelines").optional().trim().isLength({ max: GUIDELINES_MAX }),
  body("imageStyle").optional().trim().isLength({ max: TEXT_MAX }),
  body("socialMediaGuidelines")
    .optional()
    .trim()
    .isLength({ max: GUIDELINES_MAX }),
];

export const createBrandKitValidator = [
  body("projectId").trim().notEmpty().withMessage("Project ID is required."),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  ...textFieldValidators,
  ...arrayFieldValidators,
];

export const updateBrandKitValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  ...textFieldValidators,
  ...arrayFieldValidators,
];

export const brandKitIdParamValidator = [
  param("id").notEmpty().withMessage("Brand kit ID is required."),
];

export const listBrandKitsValidator = [
  query("projectId").trim().notEmpty().withMessage("Project ID is required."),
];
