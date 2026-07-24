import { readFileSync } from "node:fs";
import path from "node:path";
import type { WorkflowGraph } from "./comfyui.types.js";

// process.cwd()-relative, matching env.ts's storageLocalRoot convention —
// the backend always runs (dev via tsx, prod via node dist/index.js) with
// cwd = backend/, so this resolves the same way in both.
const WORKFLOWS_DIR = path.join(process.cwd(), "resources", "workflows");

export function workflowFilePath(name: string): string {
  return path.join(WORKFLOWS_DIR, `${name}.json`);
}

// Loads and parses a workflow template by name (no extension, e.g. "sdxl"
// for resources/workflows/sdxl.json). Deliberately synchronous — called
// both from ComfyUIProvider.generate() and from the startup fail-fast
// config check (validateComfyUIProviderConfig()), matching the sync style
// of the rest of this codebase's fail-fast validation (env.ts,
// validateLocalDiskStorageConfig()).
export function loadWorkflowTemplate(name: string): WorkflowGraph {
  const filePath = workflowFilePath(name);

  let raw: string;

  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      `ComfyUI workflow template "${name}" was not found at ${filePath}.`
    );
  }

  try {
    return JSON.parse(raw) as WorkflowGraph;
  } catch {
    throw new Error(
      `ComfyUI workflow template "${name}" at ${filePath} is not valid JSON.`
    );
  }
}
