import { describe, expect, it } from "vitest";

import { PlanVideoWorkflowSchema, WorkflowSchema } from "./video-workflow-plan.validator.js";

describe("WorkflowSchema", () => {
  it("accepts a valid multi-step plan and defaults subtitles.language to \"auto\"", () => {
    const result = WorkflowSchema.safeParse({
      steps: [
        { operation: "remove_silence", params: {} },
        { operation: "resize", params: { aspectRatio: "9:16" } },
        { operation: "subtitles", params: {} },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[2]).toEqual({
        operation: "subtitles",
        params: { language: "auto" },
      });
    }
  });

  it("rejects an unknown operation", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "delete_everything", params: {} }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a step missing required params", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "resize", params: {} }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an out-of-bounds param value", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "brightness", params: { level: 500 } }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown extra param on an otherwise-valid step", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "trim", params: { startSec: 0, endSec: 5, extra: true } }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects trim where endSec is not greater than startSec", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "trim", params: { startSec: 10, endSec: 5 } }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts trim with only startSec (no endSec)", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "trim", params: { startSec: 3 } }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty steps array", () => {
    const result = WorkflowSchema.safeParse({ steps: [] });

    expect(result.success).toBe(false);
  });

  it("rejects a plan wrapped in extra unknown top-level fields", () => {
    const result = WorkflowSchema.safeParse({
      steps: [{ operation: "normalize_audio", params: {} }],
      extraField: "not allowed",
    });

    expect(result.success).toBe(false);
  });
});

describe("PlanVideoWorkflowSchema", () => {
  it("accepts a valid request", () => {
    const result = PlanVideoWorkflowSchema.safeParse({
      videoAssetId: "video-1",
      prompt: "Remove silence and add subtitles.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing prompt", () => {
    const result = PlanVideoWorkflowSchema.safeParse({ videoAssetId: "video-1" });

    expect(result.success).toBe(false);
  });

  it("rejects a prompt over 1000 characters", () => {
    const result = PlanVideoWorkflowSchema.safeParse({
      videoAssetId: "video-1",
      prompt: "a".repeat(1001),
    });

    expect(result.success).toBe(false);
  });
});
