import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageProvider,
} from "../interfaces/image-provider.js";

const PROMPT_LOG_PREVIEW_LENGTH = 80;

// Gemini's image generation API currently only ever returns PNG bytes —
// there's no request-time format selection. GenerateImageResponse.format is
// always reported as "png" regardless of what the caller requested; see the
// "Limitations" section of tasks/completed/sprint-4-2-phase-1-gemini-provider.md
// for the resulting (pre-existing, not introduced here) metadata mismatch
// this can create, since ImageService persists the *requested* format.
const GEMINI_OUTPUT_FORMAT = "png";

// Gemini accepts a fixed aspect ratio, not arbitrary width/height. Sourced
// from https://ai.google.dev/gemini-api/docs/image-generation.
const SUPPORTED_ASPECT_RATIOS: ReadonlyArray<{ ratio: string; value: number }> = [
  { ratio: "1:1", value: 1 / 1 },
  { ratio: "16:9", value: 16 / 9 },
  { ratio: "9:16", value: 9 / 16 },
  { ratio: "4:3", value: 4 / 3 },
  { ratio: "3:4", value: 3 / 4 },
  { ratio: "3:2", value: 3 / 2 },
  { ratio: "2:3", value: 2 / 3 },
  { ratio: "21:9", value: 21 / 9 },
  { ratio: "5:4", value: 5 / 4 },
  { ratio: "4:5", value: 4 / 5 },
];

// Exported for testing — pure function, no need to go through the class.
export function nearestSupportedAspectRatio(width: number, height: number): string {
  const requested = width / height;

  return SUPPORTED_ASPECT_RATIOS.reduce((closest, candidate) =>
    Math.abs(requested - candidate.value) < Math.abs(requested - closest.value)
      ? candidate
      : closest
  ).ratio;
}

function truncatePrompt(prompt: string): string {
  return prompt.length > PROMPT_LOG_PREVIEW_LENGTH
    ? `${prompt.slice(0, PROMPT_LOG_PREVIEW_LENGTH)}…`
    : prompt;
}

// Real, hosted Gemini image generation (Sprint 4.2 Phase 1) — the first
// non-fake ImageProvider. Deliberately thin: it only ever produces bytes
// (per the interface contract) and lets errors propagate unsanitized, since
// ImageService.generate() already owns turning a provider failure into a
// safe client message and a logged, persisted FAILED record (Sprint 4.2
// Phase 0). This provider must not duplicate that sanitization — doing so
// would discard the raw detail Phase 0 specifically preserved for the
// image's owner via GET /images/:id.
export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";

  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }

  async generate(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    if (request.negativePrompt) {
      // Gemini's image generation API has no native negative-prompt
      // parameter — documented limitation, not translated into prompt text
      // (that would be inventing behavior the caller didn't ask for).
      logger.debug(
        "[GeminiImageProvider] negativePrompt was provided but is ignored — not supported by this provider."
      );
    }

    const aspectRatio = nearestSupportedAspectRatio(request.width, request.height);

    logger.debug(
      `[GeminiImageProvider] Requesting generation from model "${env.geminiModel}" (aspect ratio ${aspectRatio}) for prompt: "${truncatePrompt(request.prompt)}"`
    );

    const response = await this.client.models.generateContent({
      model: env.geminiModel,
      contents: request.prompt,
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: { aspectRatio },
      },
    });

    const imageData = response.data;

    if (!imageData) {
      throw new Error(describeMissingImage(response));
    }

    logger.debug("[GeminiImageProvider] Received image data from Gemini.");

    return {
      buffer: Buffer.from(imageData, "base64"),
      model: env.geminiModel,
      width: request.width,
      height: request.height,
      format: GEMINI_OUTPUT_FORMAT,
    };
  }
}

// Called from app.ts, only when IMAGE_PROVIDER=gemini — mirrors
// validateLocalDiskStorageConfig()'s fail-fast-at-boot pattern (Sprint 4.2
// Phase 0). Gemini is always registered (see register-image-providers.ts)
// so an explicit per-request provider:"gemini" override still works even
// when this isn't the configured default and this check doesn't run; a
// missing key in that case surfaces from the Gemini API call itself.
export function validateGeminiProviderConfig(): void {
  if (!env.geminiApiKey) {
    throw new Error(
      'IMAGE_PROVIDER is set to "gemini", but GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in the environment before starting the server.'
    );
  }
}

// GenerateContentResponse's shape is only loosely typed here on purpose —
// we only ever read two optional, best-effort diagnostic fields off it.
function describeMissingImage(response: {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string }>;
}): string {
  const blockReason = response.promptFeedback?.blockReason;

  if (blockReason) {
    return `Gemini blocked this prompt (reason: ${blockReason}) and returned no image.`;
  }

  const finishReason = response.candidates?.[0]?.finishReason;

  if (finishReason && finishReason !== "STOP") {
    return `Gemini returned no image data (finish reason: ${finishReason}).`;
  }

  return "Gemini returned no image data.";
}
