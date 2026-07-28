import { ApiError } from "./api-error.js";

export class InvalidVideoFileError extends ApiError {
  constructor(message = "The uploaded file is not a valid video.") {
    super(400, message);
    this.name = "InvalidVideoFileError";
  }
}

export class VideoUploadTooLargeError extends ApiError {
  constructor(maxBytes: number) {
    super(400, `Uploaded file exceeds the maximum size of ${maxBytes} bytes.`);
    this.name = "VideoUploadTooLargeError";
  }
}

export class NoVideoFileProvidedError extends ApiError {
  constructor() {
    super(400, "No video file was provided.");
    this.name = "NoVideoFileProvidedError";
  }
}
