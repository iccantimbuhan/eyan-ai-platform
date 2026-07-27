import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileSyncMock = vi.fn();

vi.mock("node:fs", () => ({
  readFileSync: readFileSyncMock,
}));

const { loadWorkflowTemplate, workflowFilePath } = await import(
  "./workflow.loader.js"
);

describe("workflowFilePath", () => {
  it("resolves a workflow name to a .json path under resources/workflows", () => {
    expect(workflowFilePath("sdxl")).toMatch(/resources[/\\]workflows[/\\]sdxl\.json$/);
  });
});

describe("loadWorkflowTemplate", () => {
  beforeEach(() => {
    readFileSyncMock.mockReset();
  });

  it("loads and parses a valid workflow template", () => {
    readFileSyncMock.mockReturnValue(
      JSON.stringify({ "1": { class_type: "Foo", inputs: {} } })
    );

    const result = loadWorkflowTemplate("sdxl");

    expect(result).toEqual({ "1": { class_type: "Foo", inputs: {} } });
  });

  it("throws a clear error when the workflow file does not exist", () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    expect(() => loadWorkflowTemplate("missing")).toThrow(
      /ComfyUI workflow template "missing" was not found/
    );
  });

  it("throws a clear error when the workflow file is not valid JSON", () => {
    readFileSyncMock.mockReturnValue("{ not valid json");

    expect(() => loadWorkflowTemplate("broken")).toThrow(
      /ComfyUI workflow template "broken".*is not valid JSON/
    );
  });
});
