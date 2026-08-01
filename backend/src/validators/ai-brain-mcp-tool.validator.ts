import { body, param } from "express-validator";

export const aiBrainIdForMcpToolParamValidator = [param("brainId").notEmpty().withMessage("Brain ID is required.")];
export const aiBrainMcpToolIdParamValidator = [param("mcpToolId").notEmpty().withMessage("MCP tool allowance ID is required.")];

export const createAiBrainMcpToolValidator = [
  body("mcpServerConfigId").trim().notEmpty().withMessage("mcpServerConfigId is required."),
  body("allowedTools").optional().isArray().withMessage("allowedTools must be an array."),
  body("allowedTools.*").optional().isString(),
];
