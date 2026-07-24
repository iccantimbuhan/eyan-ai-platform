import { isAxiosError } from "axios";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageFormat,
} from "../interfaces/image-provider.js";
import type { GeneratedImageBytes } from "./huggingface.client.js";
import type { HuggingFaceErrorResponse } from "./huggingface.types.js";

const CONTENT_TYPE_TO_FORMAT: Readonly<Record<string, ImageFormat>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Hugging Face's returned Content-Type reflects what the underlying model
// actually produced — derived, not assumed, same reasoning as ComfyUI's
// formatFromFilename(). Falls back to the requested format only when the
// header is missing or unrecognized.
function formatFromContentType(
  contentType: string,
  requestedFormat: ImageFormat
): ImageFormat {
  const mimeType = contentType.split(";")[0]?.trim().toLowerCase();
  return (mimeType && CONTENT_TYPE_TO_FORMAT[mimeType]) || requestedFormat;
}

export function mapHuggingFaceImageResponse(
  bytes: GeneratedImageBytes,
  request: GenerateImageRequest,
  model: string
): GenerateImageResponse {
  return {
    buffer: bytes.buffer,
    model,
    width: request.width,
    height: request.height,
    format: formatFromContentType(bytes.contentType, request.format),
  };
}

// Turns any failure from HuggingFaceClient into one clear, specific
// message for internal logging — this is deliberately the *only* place
// that inspects Hugging Face's raw error shape. HuggingFaceProvider itself
// never sanitizes or wraps this into a client-facing error (see that
// class's own comment): the message this function returns is what gets
// logged and persisted to the image owner's errorMessage, while
// ImageService's existing stage-based handling (Sprint 4.2 Phase 0) is what
// produces the safe, generic message the API client actually sees.
export function describeHuggingFaceError(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : "Unknown error";
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return `Hugging Face request timed out: ${error.message}`;
    }
    return `Hugging Face network error: ${error.message}`;
  }

  const { status } = error.response;
  const body = parseErrorBody(error.response.data);
  const detail = body?.error ? ` — ${body.error}` : "";

  switch (status) {
    case 401:
      return `Hugging Face rejected the request: invalid or missing API key${detail}`;
    case 403:
      return `Hugging Face rejected the request: forbidden — the configured token may lack permission for this model${detail}`;
    case 404:
      return `Hugging Face model not found or unsupported via the configured provider${detail}`;
    case 429:
      return `Hugging Face rate limit exceeded${detail}`;
    case 503:
      return `Hugging Face model is loading and was not ready in time${
        body?.estimated_time ? ` (estimated ${body.estimated_time}s)` : ""
      }${detail}`;
    default:
      return `Hugging Face request failed with status ${status}${detail}`;
  }
}

// The image-generation call uses responseType: "arraybuffer" (needed for a
// successful binary response), so an error response's JSON body also
// arrives as raw bytes rather than being parsed automatically — decoded
// here, defensively, since a non-JSON error body (plain text, HTML from an
// intermediary proxy) is also possible.
function parseErrorBody(data: unknown): HuggingFaceErrorResponse | undefined {
  try {
    const text =
      typeof data === "string"
        ? data
        : data instanceof ArrayBuffer || ArrayBuffer.isView(data) || Buffer.isBuffer(data)
          ? Buffer.from(data as ArrayBuffer).toString("utf-8")
          : undefined;

    return text ? (JSON.parse(text) as HuggingFaceErrorResponse) : undefined;
  } catch {
    return undefined;
  }
}
