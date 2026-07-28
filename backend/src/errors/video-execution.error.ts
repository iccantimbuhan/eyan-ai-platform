import { ApiError } from "./api-error.js";

export class UnsupportedVideoOperationError extends ApiError {
  constructor(operation: string) {
    super(
      422,
      `The workflow contains an operation that cannot be executed yet: "${operation}". Only trim, remove_silence, normalize_audio, resize, brightness, and subtitles are executable in this version.`
    );
    this.name = "UnsupportedVideoOperationError";
  }
}

export class InvalidWorkflowPlanError extends ApiError {
  constructor(
    message = "The stored workflow plan is invalid and cannot be executed."
  ) {
    super(422, message);
    this.name = "InvalidWorkflowPlanError";
  }
}

export class VideoExecutionFailedError extends ApiError {
  constructor(message = "Video execution failed. Please try again.") {
    super(502, message);
    this.name = "VideoExecutionFailedError";
  }
}
