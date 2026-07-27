import { ApiError } from "./api-error.js";

// Thrown for an action a given asset type structurally doesn't support
// (e.g. regenerating a PROMPT_TEMPLATE, which has no provider-backed
// generation to repeat) — a client request error, not a server failure.
export class AssetActionNotSupportedError extends ApiError {
  constructor(message: string) {
    super(400, message);
    this.name = "AssetActionNotSupportedError";
  }
}
