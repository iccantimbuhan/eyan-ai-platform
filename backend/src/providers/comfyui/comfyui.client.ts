import axios, { type AxiosInstance } from "axios";
import type {
  ComfyUIHistoryEntry,
  ComfyUIHistoryResponse,
  ComfyUIOutputImage,
  ComfyUIPromptSubmissionResponse,
  WorkflowGraph,
} from "./comfyui.types.js";

// Timeout for a single HTTP call to ComfyUI (submit/history/download/
// reachability). Deliberately separate from env.comfyuiTimeout, which
// bounds the *overall* generation budget (submit + poll-until-complete) in
// ComfyUIProvider — a single history poll should return almost instantly
// even when the generation itself is still running.
const REQUEST_TIMEOUT_MS = 15_000;

// Thin wrapper over ComfyUI's standard REST API. No retry logic here —
// ComfyUIProvider owns retry/timeout semantics for the overall generation
// (via polling), so this client stays a simple, testable HTTP boundary.
export class ComfyUIClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({ baseURL, timeout: REQUEST_TIMEOUT_MS });
  }

  async submitPrompt(
    workflow: WorkflowGraph
  ): Promise<ComfyUIPromptSubmissionResponse> {
    const response = await this.http.post<ComfyUIPromptSubmissionResponse>(
      "/prompt",
      { prompt: workflow }
    );

    return response.data;
  }

  async getHistory(promptId: string): Promise<ComfyUIHistoryEntry | undefined> {
    const response = await this.http.get<ComfyUIHistoryResponse>(
      `/history/${promptId}`
    );

    return response.data[promptId];
  }

  async downloadImage(image: ComfyUIOutputImage): Promise<Buffer> {
    const response = await this.http.get("/view", {
      params: {
        filename: image.filename,
        subfolder: image.subfolder,
        type: image.type,
      },
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data as ArrayBuffer);
  }

  // /system_stats is ComfyUI's lightweight, side-effect-free endpoint —
  // used by the (non-fatal) startup health check in comfyui.provider.ts.
  async checkReachable(): Promise<void> {
    await this.http.get("/system_stats");
  }
}
