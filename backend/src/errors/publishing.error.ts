import { ApiError } from "./api-error.js";

export class UnsupportedPlatformProviderError extends ApiError {
  constructor(platform: string) {
    super(400, `Unsupported publishing platform: "${platform}".`);
    this.name = "UnsupportedPlatformProviderError";
  }
}

export class AssetNotApprovedError extends ApiError {
  constructor() {
    super(
      400,
      "This asset must be approved (ReviewStatus.APPROVED) before it can be scheduled or published."
    );
    this.name = "AssetNotApprovedError";
  }
}

export class PublishingRecordNotFoundError extends ApiError {
  constructor() {
    super(404, "No publishing record exists for this asset and platform.");
    this.name = "PublishingRecordNotFoundError";
  }
}

export class PublishingRetryNotAllowedError extends ApiError {
  constructor() {
    super(400, "Only a failed publishing record can be retried.");
    this.name = "PublishingRetryNotAllowedError";
  }
}

export class PublishingFailedError extends ApiError {
  constructor(message = "Publishing failed.") {
    super(502, message);
    this.name = "PublishingFailedError";
  }
}
