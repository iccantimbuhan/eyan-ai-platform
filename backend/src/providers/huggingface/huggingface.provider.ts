import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageProvider,
} from "../interfaces/image-provider.js";
import { randomSeed } from "../random-seed.util.js";
import { HuggingFaceClient } from "./huggingface.client.js";
import { describeHuggingFaceError, mapHuggingFaceImageResponse } from "./response.mapper.js";
import { isValidModelId } from "./model.config.js";
import type { HuggingFaceTextToImageRequest } from "./huggingface.types.js";

const PROMPT_LOG_PREVIEW_LENGTH = 80;

function truncatePrompt(prompt: string): string {
  return prompt.length > PROMPT_LOG_PREVIEW_LENGTH
    ? `${prompt.slice(0, PROMPT_LOG_PREVIEW_LENGTH)}…`
    : prompt;
}

function buildRequest(request: GenerateImageRequest): HuggingFaceTextToImageRequest {
  return {
    inputs: request.prompt,
    parameters: {
      // negative_prompt is part of Hugging Face's documented text-to-image
      // parameters and widely supported across diffusers-based models —
      // unlike Gemini, there's no need to silently drop it; a model that
      // doesn't use it simply ignores the field.
      negative_prompt: request.negativePrompt,
      width: request.width,
      height: request.height,
      // GenerateImageRequest has no seed field (see random-seed.util.ts) —
      // same reasoning as ComfyUIProvider's cfg/steps: provider-specific
      // tuning knobs get a sane default inside the provider, not the shared
      // interface every provider implements.
      seed: randomSeed(),
    },
  };
}

// Real, hosted Hugging Face image generation (Sprint 4.4; migrated off a
// hardcoded "hf-inference" REST call to the official @huggingface/inference
// SDK with provider "auto" after hf-inference stopped serving the
// configured model — see docs/HUGGINGFACE_PROVIDER.md, "Provider migration"
// section, for the full incident). A third real ImageProvider alongside
// GeminiImageProvider and ComfyUIProvider, using Hugging Face's official
// Inference Providers API — never an unofficial endpoint, never a
// third-party wrapper.
//
// Like the other two real providers, this class never sanitizes its own
// errors — they propagate raw so ImageService's stage-based error handling
// (Sprint 4.2 Phase 0) logs the detail, persists it to the image owner's
// errorMessage, and throws the safe client-facing message. See
// GeminiImageProvider's own comment for the full reasoning.
export class HuggingFaceProvider implements ImageProvider {
  readonly name = "huggingface";

  private readonly client: HuggingFaceClient;

  constructor() {
    this.client = new HuggingFaceClient(
      env.huggingfaceApiKey,
      env.huggingfaceTimeout,
      env.huggingfaceProvider
    );
  }

  async generate(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    const model = env.huggingfaceModel;

    logger.debug(
      `[HuggingFaceProvider] Requesting generation from model "${model}" for prompt: "${truncatePrompt(request.prompt)}"`
    );

    let bytes;

    try {
      bytes = await this.client.generateImage(model, buildRequest(request));
    } catch (error) {
      // Re-thrown as a plain Error carrying a specific, Hugging-Face-aware
      // message (invalid key vs. forbidden vs. rate limited vs. model
      // loading vs. timeout vs. network failure) — still unsanitized and
      // still propagated raw; see the class comment above for why.
      throw new Error(describeHuggingFaceError(error));
    }

    logger.debug(
      `[HuggingFaceProvider] Received ${bytes.buffer.byteLength} bytes (${bytes.contentType || "unknown content-type"}) from model "${model}".`
    );

    return mapHuggingFaceImageResponse(bytes, request, model);
  }
}

// Called from app.ts, only when IMAGE_PROVIDER=huggingface — mirrors
// validateGeminiProviderConfig()/validateComfyUIProviderConfig()'s
// fail-fast-at-boot pattern. Synchronous and network-free: validates
// presence/shape of configuration only, never whether the account/model
// combination actually works (that's the non-fatal health check below).
export function validateHuggingFaceProviderConfig(): void {
  if (!env.huggingfaceApiKey.trim()) {
    throw new Error(
      'IMAGE_PROVIDER is set to "huggingface", but HUGGINGFACE_API_KEY is not configured.'
    );
  }

  if (!env.huggingfaceModel.trim()) {
    throw new Error(
      'IMAGE_PROVIDER is set to "huggingface", but HUGGINGFACE_MODEL is not configured.'
    );
  }

  if (!isValidModelId(env.huggingfaceModel)) {
    throw new Error(
      `HUGGINGFACE_MODEL "${env.huggingfaceModel}" is not a valid Hugging Face model id (expected "namespace/model-name").`
    );
  }

  if (!env.huggingfaceProvider.trim()) {
    throw new Error(
      'IMAGE_PROVIDER is set to "huggingface", but HUGGINGFACE_PROVIDER is not configured.'
    );
  }

  if (!Number.isFinite(env.huggingfaceTimeout) || env.huggingfaceTimeout <= 0) {
    throw new Error("HUGGINGFACE_TIMEOUT must be a positive number of milliseconds.");
  }
}

export interface HuggingFaceHealthResult {
  reachable: boolean;
  authValid: boolean;
  modelConfigured: boolean;
  configValid: boolean;
  detail?: string;
}

// Network-dependent half of provider health validation, kept separate from
// validateHuggingFaceProviderConfig() for the same reason as ComfyUI's
// equivalent split: "is the API reachable, is this token valid, is this
// model actually available to it" are live, fallible network questions,
// unlike this codebase's synchronous startup checks. Deliberately never
// generates an image — both calls it makes are Hub metadata lookups (see
// HuggingFaceClient), which is the explicit requirement for this check.
export async function checkHuggingFaceHealth(): Promise<HuggingFaceHealthResult> {
  try {
    validateHuggingFaceProviderConfig();
  } catch (error) {
    return {
      reachable: false,
      authValid: false,
      modelConfigured: false,
      configValid: false,
      detail: describeHuggingFaceError(error),
    };
  }

  const client = new HuggingFaceClient(
    env.huggingfaceApiKey,
    env.huggingfaceTimeout,
    env.huggingfaceProvider
  );

  try {
    await client.checkAuth();
  } catch (error) {
    return {
      reachable: true,
      authValid: false,
      modelConfigured: false,
      configValid: true,
      detail: describeHuggingFaceError(error),
    };
  }

  try {
    await client.checkModelAvailable(env.huggingfaceModel);
  } catch (error) {
    return {
      reachable: true,
      authValid: true,
      modelConfigured: false,
      configValid: true,
      detail: describeHuggingFaceError(error),
    };
  }

  return { reachable: true, authValid: true, modelConfigured: true, configValid: true };
}

// Fire-and-forget: logs the result of checkHuggingFaceHealth() without
// blocking server startup on a network call — same non-fatal-at-boot
// philosophy as logComfyUIHealthCheck().
export function logHuggingFaceHealthCheck(): void {
  checkHuggingFaceHealth()
    .then((result) => {
      if (result.reachable && result.authValid && result.modelConfigured) {
        logger.info(
          `[HuggingFaceProvider] Health check passed — authenticated, model "${env.huggingfaceModel}" available.`
        );
      } else {
        logger.warn(
          `[HuggingFaceProvider] Health check failed: ${result.detail ?? "unknown reason"}. Startup will continue; generation requests will fail until this is resolved.`
        );
      }
    })
    .catch((error) => {
      logger.warn(
        `[HuggingFaceProvider] Health check threw unexpectedly: ${describeHuggingFaceError(error)}`
      );
    });
}
