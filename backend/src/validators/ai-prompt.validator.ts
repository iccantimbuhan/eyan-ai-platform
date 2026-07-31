import { body, param } from "express-validator";

export const aiBrainIdForPromptParamValidator = [param("brainId").notEmpty().withMessage("Brain ID is required.")];
export const aiPromptIdParamValidator = [param("promptId").notEmpty().withMessage("Prompt ID is required.")];

export const createAiPromptValidator = [
  body("version").trim().notEmpty().withMessage("version is required."),
  body("body").trim().notEmpty().withMessage("body is required."),
];
