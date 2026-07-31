import { body } from "express-validator";

export const runAiEvaluationValidator = [
  body("promptId").trim().notEmpty().withMessage("promptId is required."),
  body("testCaseName").trim().notEmpty().withMessage("testCaseName is required."),
  body("input").isObject().withMessage("input must be an object."),
  body("expectedShape").optional().isObject(),
];
