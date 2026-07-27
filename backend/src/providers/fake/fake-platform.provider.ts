import { logger } from "../../lib/logger.js";
import type {
  PlatformProvider,
  PublishRequest,
  PublishResult,
} from "../interfaces/platform-provider.js";

// Deterministic, in-process placeholder — no network calls, no randomness.
// Exists so the full publishing pipeline (PublishingRecord ->
// PlatformProvider -> status/timeline update) can be exercised and tested
// end-to-end before any real, billable platform integration exists.
// Registered under the name "fake" — see register-platform-providers.ts.
export class FakePlatformProvider implements PlatformProvider {
  readonly name = "fake";

  async publish(request: PublishRequest): Promise<PublishResult> {
    logger.debug(
      `[FakePlatformProvider] Publishing ${request.assetType}:${request.sourceId} ("${request.title}")`
    );

    return {
      externalId: `fake-${request.assetType.toLowerCase()}-${request.sourceId}`,
      externalUrl: `https://fake-platform.example.com/posts/${request.assetType.toLowerCase()}-${request.sourceId}`,
    };
  }
}
