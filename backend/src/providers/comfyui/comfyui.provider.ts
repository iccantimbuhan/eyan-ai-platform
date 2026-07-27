import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageFormat,
  ImageProvider,
} from "../interfaces/image-provider.js";
import { ComfyUIClient } from "./comfyui.client.js";
import { loadWorkflowTemplate } from "./workflow.loader.js";
import { renderWorkflow } from "./workflow.mapper.js";
import type {
  ComfyUIHistoryEntry,
  ComfyUIOutputImage,
  WorkflowPlaceholderValues,
} from "./comfyui.types.js";
import { randomSeed } from "../random-seed.util.js";

const PROMPT_LOG_PREVIEW_LENGTH = 80;

// ComfyUI workflows commonly expose these as tunable node inputs, but
// GenerateImageRequest (the shared, provider-agnostic contract) has no
// seed/cfg/steps fields — deliberately not added there, since they're
// ComfyUI-specific generation parameters, not something every provider
// supports. Same reasoning already applied to Stability AI's steps/
// cfg_scale/sampler in the provider-integration backlog doc: sane fixed
// defaults live inside the provider, not the shared interface.
const DEFAULT_CFG = 7.0;
const DEFAULT_STEPS = 20;
const SUPPORTED_IMAGE_FORMATS: ReadonlySet<string> = new Set([
  "png",
  "jpg",
  "webp",
]);

function truncatePrompt(prompt: string): string {
  return prompt.length > PROMPT_LOG_PREVIEW_LENGTH
    ? `${prompt.slice(0, PROMPT_LOG_PREVIEW_LENGTH)}…`
    : prompt;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function findFirstOutputImage(
  entry: ComfyUIHistoryEntry
): ComfyUIOutputImage | undefined {
  // Never assumes a specific node id — a workflow's SaveImage node can be
  // given any id by whoever authored the template. The first node output
  // that has any images is treated as the result, matching this provider's
  // "no hardcoded node ids" requirement.
  for (const nodeOutput of Object.values(entry.outputs ?? {})) {
    const [image] = nodeOutput.images ?? [];
    if (image) return image;
  }

  return undefined;
}

// ComfyUI's own SaveImage node determines the actual output format (most
// commonly PNG, but a template can use a different save node) — derived
// from the returned filename's extension rather than assumed, since unlike
// Gemini, ComfyUI's output format genuinely depends on the workflow. Falls
// back to the requested format only if the filename's extension is
// unrecognized.
function formatFromFilename(
  filename: string,
  requestedFormat: ImageFormat
): ImageFormat {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "jpeg") return "jpg";
  if (extension && SUPPORTED_IMAGE_FORMATS.has(extension)) {
    return extension as ImageFormat;
  }

  return requestedFormat;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Real, hosted ComfyUI image generation (Sprint 4.3) — a second real
// ImageProvider alongside GeminiImageProvider, and the first whose
// generation is asynchronous on the provider's own side (submit, then poll
// for completion) rather than a single request/response round trip.
//
// Like GeminiImageProvider, this class never sanitizes its own errors —
// they propagate raw so ImageService's stage-based error handling (Sprint
// 4.2 Phase 0) logs the detail, persists it to the image owner's
// errorMessage, and throws the safe client-facing message. See that
// class's own comment for the full reasoning; it applies identically here.
export class ComfyUIProvider implements ImageProvider {
  readonly name = "comfyui";

  private readonly client: ComfyUIClient;

  constructor() {
    this.client = new ComfyUIClient(env.comfyuiUrl);
  }

  async generate(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    const template = loadWorkflowTemplate(env.comfyuiWorkflow);

    const values: WorkflowPlaceholderValues = {
      prompt: request.prompt,
      negativePrompt: request.negativePrompt ?? "",
      width: request.width,
      height: request.height,
      seed: randomSeed(),
      cfg: DEFAULT_CFG,
      steps: DEFAULT_STEPS,
    };

    const workflow = renderWorkflow(template, values);

    logger.debug(
      `[ComfyUIProvider] Submitting workflow "${env.comfyuiWorkflow}" for prompt: "${truncatePrompt(request.prompt)}"`
    );

    const submission = await this.client.submitPrompt(workflow);

    if (!submission.prompt_id) {
      throw new Error(
        "ComfyUI did not return a prompt_id for the submitted workflow."
      );
    }

    if (
      submission.node_errors &&
      Object.keys(submission.node_errors).length > 0
    ) {
      throw new Error(
        `ComfyUI rejected workflow "${env.comfyuiWorkflow}": ${JSON.stringify(submission.node_errors)}`
      );
    }

    logger.debug(
      `[ComfyUIProvider] Workflow submitted, prompt_id ${submission.prompt_id}. Polling for completion (timeout ${env.comfyuiTimeout}ms, interval ${env.comfyuiPollInterval}ms).`
    );

    const image = await this.pollForImage(submission.prompt_id);

    logger.debug(
      `[ComfyUIProvider] Downloading generated image "${image.filename}" (prompt_id ${submission.prompt_id}).`
    );

    const buffer = await this.client.downloadImage(image);

    return {
      buffer,
      model: env.comfyuiWorkflow,
      width: request.width,
      height: request.height,
      format: formatFromFilename(image.filename, request.format),
    };
  }

  private async pollForImage(promptId: string): Promise<ComfyUIOutputImage> {
    const deadline = Date.now() + env.comfyuiTimeout;

    while (Date.now() < deadline) {
      const entry = await this.client.getHistory(promptId);

      if (entry) {
        if (entry.status?.status_str === "error") {
          throw new Error(
            `ComfyUI reported a generation error for prompt ${promptId}.`
          );
        }

        const image = findFirstOutputImage(entry);
        if (image) return image;

        if (entry.status?.completed) {
          throw new Error(
            `ComfyUI finished prompt ${promptId} but produced no output image.`
          );
        }
      }

      await sleep(env.comfyuiPollInterval);
    }

    throw new Error(
      `ComfyUI generation timed out after ${env.comfyuiTimeout}ms waiting for prompt ${promptId}.`
    );
  }
}

// Called from app.ts, only when IMAGE_PROVIDER=comfyui — mirrors
// validateGeminiProviderConfig()/validateLocalDiskStorageConfig()'s
// fail-fast-at-boot pattern (Sprint 4.2 Phase 0). Deliberately synchronous
// and network-free: it validates the *shape* of the configuration and that
// the configured workflow template exists and parses, without requiring
// ComfyUI itself to be reachable at boot (that's covered, non-fatally, by
// logComfyUIHealthCheck() below).
export function validateComfyUIProviderConfig(): void {
  if (!env.comfyuiUrl.trim()) {
    throw new Error(
      'IMAGE_PROVIDER is set to "comfyui", but COMFYUI_URL is not configured.'
    );
  }

  if (!env.comfyuiWorkflow.trim()) {
    throw new Error(
      'IMAGE_PROVIDER is set to "comfyui", but COMFYUI_WORKFLOW is not configured.'
    );
  }

  if (!Number.isFinite(env.comfyuiTimeout) || env.comfyuiTimeout <= 0) {
    throw new Error("COMFYUI_TIMEOUT must be a positive number of milliseconds.");
  }

  if (!Number.isFinite(env.comfyuiPollInterval) || env.comfyuiPollInterval <= 0) {
    throw new Error(
      "COMFYUI_POLL_INTERVAL must be a positive number of milliseconds."
    );
  }

  // Fails fast (throws) if the configured workflow template is missing or
  // not valid JSON — satisfies "workflow exists" without a network call.
  loadWorkflowTemplate(env.comfyuiWorkflow);
}

export interface ComfyUIHealthResult {
  reachable: boolean;
  configValid: boolean;
  detail?: string;
}

// Network-dependent half of provider health validation — kept separate
// from validateComfyUIProviderConfig() because "is ComfyUI reachable right
// now" is inherently a live, fallible network check, unlike this
// codebase's other startup validation (all synchronous, network-free).
// Exported so it's independently testable and could back a future health
// endpoint, not just the startup log line in logComfyUIHealthCheck().
export async function checkComfyUIHealth(): Promise<ComfyUIHealthResult> {
  try {
    validateComfyUIProviderConfig();
  } catch (error) {
    return { reachable: false, configValid: false, detail: errorMessageOf(error) };
  }

  try {
    await new ComfyUIClient(env.comfyuiUrl).checkReachable();
    return { reachable: true, configValid: true };
  } catch (error) {
    return { reachable: false, configValid: true, detail: errorMessageOf(error) };
  }
}

// Fire-and-forget: logs the result of checkComfyUIHealth() without
// blocking server startup on a network call. A temporarily-unreachable
// ComfyUI instance at boot time (e.g. service restart ordering) shouldn't
// prevent the whole backend from starting — only a genuinely invalid
// configuration does that, via validateComfyUIProviderConfig() above.
export function logComfyUIHealthCheck(): void {
  checkComfyUIHealth()
    .then((result) => {
      if (result.reachable) {
        logger.info(
          `[ComfyUIProvider] Health check passed — reachable at ${env.comfyuiUrl}, workflow "${env.comfyuiWorkflow}" valid.`
        );
      } else {
        logger.warn(
          `[ComfyUIProvider] Health check failed: ${result.detail ?? "unknown reason"}. Startup will continue; generation requests will fail until this is resolved.`
        );
      }
    })
    .catch((error) => {
      logger.warn(
        `[ComfyUIProvider] Health check threw unexpectedly: ${errorMessageOf(error)}`
      );
    });
}
