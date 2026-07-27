import { body, param } from "express-validator";

const TRANSPORTS = ["STDIO", "HTTP", "SSE"];

export const mcpServerConfigIdParamValidator = [
  param("id").notEmpty().withMessage("MCP server config ID is required."),
];

export const createMcpServerConfigValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  body("provider")
    .trim()
    .notEmpty()
    .withMessage("Provider is required.")
    .isLength({ max: 100 })
    .withMessage("Provider must not exceed 100 characters."),

  body("transport")
    .trim()
    .notEmpty()
    .withMessage("Transport is required.")
    .isIn(TRANSPORTS)
    .withMessage(`Transport must be one of: ${TRANSPORTS.join(", ")}.`),

  body("command").optional().trim().isLength({ max: 500 }),
  body("args").optional().isArray().withMessage("Args must be an array."),
  body("args.*").optional().isString().withMessage("Each arg must be a string."),
  body("url").optional().trim().isLength({ max: 500 }),
  body("connectionId").optional().trim().notEmpty(),
  body("isEnabled")
    .optional()
    .isBoolean()
    .withMessage("isEnabled must be a boolean.")
    .toBoolean(),
  body("config").optional().isObject().withMessage("Config must be an object."),
];

export const updateMcpServerConfigValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  body("transport")
    .optional()
    .trim()
    .isIn(TRANSPORTS)
    .withMessage(`Transport must be one of: ${TRANSPORTS.join(", ")}.`),

  body("command").optional().trim().isLength({ max: 500 }),
  body("args").optional().isArray().withMessage("Args must be an array."),
  body("args.*").optional().isString().withMessage("Each arg must be a string."),
  body("url").optional().trim().isLength({ max: 500 }),
  body("connectionId").optional().trim().notEmpty(),
  body("isEnabled")
    .optional()
    .isBoolean()
    .withMessage("isEnabled must be a boolean.")
    .toBoolean(),
  body("config").optional().isObject().withMessage("Config must be an object."),
];
