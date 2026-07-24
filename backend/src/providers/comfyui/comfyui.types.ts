// Shapes for ComfyUI's standard REST API (POST /prompt, GET /history/{id},
// GET /view) and for the workflow-template JSON files under
// backend/resources/workflows/. Kept intentionally loose (Record<string,
// unknown> for node inputs) since a workflow graph's shape is defined by
// whichever ComfyUI custom nodes the template author has installed, not by
// this backend.

export interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

// A ComfyUI "API format" workflow graph: node id -> node definition. Node
// ids are arbitrary strings chosen by whoever exported the workflow — never
// hardcoded or assumed by this provider.
export type WorkflowGraph = Record<string, WorkflowNode>;

// Values substituted into a workflow template's {{PLACEHOLDER}} tokens
// before submission — see workflow.mapper.ts.
export interface WorkflowPlaceholderValues {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  cfg: number;
  steps: number;
}

export interface ComfyUIPromptSubmissionResponse {
  prompt_id: string;
  number?: number;
  // Present (and non-empty) when the queued workflow failed validation —
  // keyed by node id. An empty object/undefined means the workflow was
  // accepted.
  node_errors?: Record<string, unknown>;
}

export interface ComfyUIOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

export interface ComfyUIHistoryStatus {
  status_str?: string;
  completed?: boolean;
  messages?: unknown[];
}

export interface ComfyUIHistoryEntry {
  status?: ComfyUIHistoryStatus;
  // Keyed by node id — a workflow's SaveImage node (whichever id the
  // template author gave it) is the one whose entry has an `images` array.
  outputs: Record<string, { images?: ComfyUIOutputImage[] }>;
}

// GET /history/{prompt_id} returns a dictionary keyed by prompt_id, even
// though only one entry is ever relevant to a given request.
export type ComfyUIHistoryResponse = Record<string, ComfyUIHistoryEntry>;
