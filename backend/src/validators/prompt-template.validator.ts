import { query } from "express-validator";

import { ContentType } from "../generated/prisma/enums.js";

const CONTENT_TYPES = Object.values(ContentType);

export const listPromptTemplatesValidator = [
  query("category")
    .optional()
    .isString(),

  query("contentType")
    .optional()
    .isIn(CONTENT_TYPES)
    .withMessage("Invalid content type."),
];
