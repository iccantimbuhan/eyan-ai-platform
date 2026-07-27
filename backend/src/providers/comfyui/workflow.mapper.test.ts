import { describe, expect, it } from "vitest";
import { renderWorkflow } from "./workflow.mapper.js";
import type { WorkflowGraph, WorkflowPlaceholderValues } from "./comfyui.types.js";

const values: WorkflowPlaceholderValues = {
  prompt: "a lighthouse at sunset",
  negativePrompt: "blurry, low quality",
  width: 1024,
  height: 768,
  seed: 42,
  cfg: 7.5,
  steps: 20,
};

describe("renderWorkflow", () => {
  it("substitutes text placeholders as strings", () => {
    const template: WorkflowGraph = {
      "6": {
        class_type: "CLIPTextEncode",
        inputs: { text: "{{PROMPT}}", clip: ["4", 1] },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["6"].inputs.text).toBe("a lighthouse at sunset");
  });

  it("substitutes an exact numeric placeholder as a real number, not a string", () => {
    const template: WorkflowGraph = {
      "3": {
        class_type: "KSampler",
        inputs: { seed: "{{SEED}}", cfg: "{{CFG}}", steps: "{{STEPS}}" },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["3"].inputs.seed).toBe(42);
    expect(typeof result["3"].inputs.seed).toBe("number");
    expect(result["3"].inputs.cfg).toBe(7.5);
    expect(result["3"].inputs.steps).toBe(20);
  });

  it("substitutes width/height placeholders as numbers", () => {
    const template: WorkflowGraph = {
      "5": {
        class_type: "EmptyLatentImage",
        inputs: { width: "{{WIDTH}}", height: "{{HEIGHT}}", batch_size: 1 },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["5"].inputs.width).toBe(1024);
    expect(result["5"].inputs.height).toBe(768);
  });

  it("never mangles node-link reference arrays like [\"4\", 0]", () => {
    const template: WorkflowGraph = {
      "3": {
        class_type: "KSampler",
        inputs: { model: ["4", 0], seed: "{{SEED}}" },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["3"].inputs.model).toEqual(["4", 0]);
    expect(typeof (result["3"].inputs.model as unknown[])[0]).toBe("string");
  });

  it("leaves an unknown placeholder token untouched", () => {
    const template: WorkflowGraph = {
      "1": { class_type: "Foo", inputs: { text: "{{UNKNOWN_TOKEN}}" } },
    };

    const result = renderWorkflow(template, values);

    expect(result["1"].inputs.text).toBe("{{UNKNOWN_TOKEN}}");
  });

  it("substitutes multiple placeholders embedded within a single string as text", () => {
    const template: WorkflowGraph = {
      "1": {
        class_type: "Foo",
        inputs: { text: "prompt=({{PROMPT}}) negative=({{NEGATIVE_PROMPT}})" },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["1"].inputs.text).toBe(
      "prompt=(a lighthouse at sunset) negative=(blurry, low quality)"
    );
  });

  it("leaves values with no placeholders completely unchanged", () => {
    const template: WorkflowGraph = {
      "4": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
      },
    };

    const result = renderWorkflow(template, values);

    expect(result["4"].inputs.ckpt_name).toBe("sd_xl_base_1.0.safetensors");
  });

  it("does not mutate the original template", () => {
    const template: WorkflowGraph = {
      "6": { class_type: "CLIPTextEncode", inputs: { text: "{{PROMPT}}" } },
    };

    renderWorkflow(template, values);

    expect(template["6"].inputs.text).toBe("{{PROMPT}}");
  });
});
