import type { WorkflowGraph, WorkflowPlaceholderValues } from "./comfyui.types.js";

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;
const EXACT_PLACEHOLDER_PATTERN = /^\{\{(\w+)\}\}$/;
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

function placeholderMap(
  values: WorkflowPlaceholderValues
): Record<string, string> {
  return {
    PROMPT: values.prompt,
    NEGATIVE_PROMPT: values.negativePrompt,
    WIDTH: String(values.width),
    HEIGHT: String(values.height),
    SEED: String(values.seed),
    CFG: String(values.cfg),
    STEPS: String(values.steps),
  };
}

// A string that is *exactly* one placeholder (e.g. `"{{SEED}}"`, required
// because JSON has no unquoted numeric-looking placeholder syntax) resolves
// to a real number when its value is numeric — ComfyUI expects `seed`,
// `width`, etc. as numbers, not strings. A placeholder embedded in a larger
// string (e.g. prompt text) is only ever substituted as text.
//
// This distinction also protects node-link references like `["4", 0]`:
// "4" contains no `{{...}}` token at all, so it passes through completely
// unchanged rather than being coerced into the number 4.
function renderString(value: string, map: Record<string, string>): string | number {
  const exact = EXACT_PLACEHOLDER_PATTERN.exec(value);

  if (exact && exact[1] in map) {
    const resolved = map[exact[1]];
    return NUMERIC_PATTERN.test(resolved) ? Number(resolved) : resolved;
  }

  return value.replace(PLACEHOLDER_PATTERN, (match, key: string) =>
    key in map ? map[key] : match
  );
}

function renderValue(value: unknown, map: Record<string, string>): unknown {
  if (typeof value === "string") {
    return renderString(value, map);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderValue(item, map));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renderValue(item, map)])
    );
  }

  return value;
}

// Deep-substitutes every {{PLACEHOLDER}} token in a workflow template with
// the given values, returning a new, fully-resolved workflow graph ready to
// submit to ComfyUI. The template itself is never mutated.
export function renderWorkflow(
  template: WorkflowGraph,
  values: WorkflowPlaceholderValues
): WorkflowGraph {
  return renderValue(template, placeholderMap(values)) as WorkflowGraph;
}
