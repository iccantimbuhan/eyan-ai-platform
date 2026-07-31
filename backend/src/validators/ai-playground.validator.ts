import { body } from "express-validator";

export const invokeAiPlaygroundValidator = [
  body("input").isObject().withMessage("input must be an object."),
  body("capabilityKey").optional().trim().isString(),
  body("brainKey").optional().trim().isString(),
  body("overrides").optional().isObject(),
  body("overrides.providerId").optional().trim().isString(),
  body("overrides.modelId").optional().trim().isString(),
  body("overrides.promptVersion").optional().trim().isString(),
  body().custom((value) => {
    if (!value.capabilityKey && !value.brainKey) {
      throw new Error("Either capabilityKey or brainKey is required.");
    }
    return true;
  }),
];
