import { ApiError } from "./api-error.js";

export class UnsupportedImageProviderError extends ApiError {
  constructor(providerName: string) {
    super(400, `Unsupported image provider: "${providerName}".`);
    this.name = "UnsupportedImageProviderError";
  }
}

export class ImageGenerationError extends ApiError {
  constructor(message = "Image generation failed.") {
    super(502, message);
    this.name = "ImageGenerationError";
  }
}
