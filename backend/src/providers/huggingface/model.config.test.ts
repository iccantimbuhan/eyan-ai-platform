import { describe, expect, it } from "vitest";
import { DEFAULT_HUGGINGFACE_MODEL, isValidModelId } from "./model.config.js";

describe("DEFAULT_HUGGINGFACE_MODEL", () => {
  it("is itself a valid model id", () => {
    expect(isValidModelId(DEFAULT_HUGGINGFACE_MODEL)).toBe(true);
  });
});

describe("isValidModelId", () => {
  it("accepts a well-formed namespace/model-name id", () => {
    expect(isValidModelId("black-forest-labs/FLUX.1-schnell")).toBe(true);
    expect(
      isValidModelId("stabilityai/stable-diffusion-3-medium-diffusers")
    ).toBe(true);
  });

  it("accepts surrounding whitespace", () => {
    expect(isValidModelId("  org/model  ")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidModelId("")).toBe(false);
  });

  it("rejects a model id with no namespace", () => {
    expect(isValidModelId("just-a-name")).toBe(false);
  });

  it("rejects a model id with more than one slash", () => {
    expect(isValidModelId("org/sub/model")).toBe(false);
  });

  it("rejects a model id containing whitespace internally", () => {
    expect(isValidModelId("org/model name")).toBe(false);
  });
});
