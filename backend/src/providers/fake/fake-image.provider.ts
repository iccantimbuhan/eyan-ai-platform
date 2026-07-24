import { logger } from "../../lib/logger.js";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageProvider,
} from "../interfaces/image-provider.js";

const FAKE_MODEL_NAME = "fake-image-v1";

// Deterministic, in-process placeholder — no network calls, no randomness.
// Exists so the full generation pipeline (ImageProvider -> StorageProvider
// -> GeneratedImage persistence) can be exercised and tested end-to-end
// before any real, billable provider is integrated (Sprint 4.1 Phase 4).
// Registered under the name "fake" — see register-image-providers.ts.
export class FakeImageProvider implements ImageProvider {
  readonly name = "fake";

  async generate(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    logger.debug(
      `[FakeImageProvider] Generating ${request.width}x${request.height}.${request.format} for prompt: "${request.prompt}"`
    );

    const buffer = Buffer.from(
      `FAKE_IMAGE prompt="${request.prompt}" ${request.width}x${request.height}.${request.format}`,
      "utf-8"
    );

    return {
      buffer,
      model: FAKE_MODEL_NAME,
      width: request.width,
      height: request.height,
      format: request.format,
    };
  }
}
