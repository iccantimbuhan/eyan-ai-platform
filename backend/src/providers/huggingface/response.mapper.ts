import { isAxiosError } from "axios";
import {
  InferenceClientHubApiError,
  InferenceClientInputError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientRoutingError,
} from "@huggingface/inference";
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

// Turns any failure into one clear, specific message for internal logging —
// this is deliberately the *only* place that inspects Hugging Face's raw
// error shape. HuggingFaceProvider itself never sanitizes or wraps this into
// a client-facing error (see that class's own comment): the message this
// function returns is what gets logged and persisted to the image owner's
// errorMessage, while ImageService's existing stage-based handling
// (Sprint 4.2 Phase 0) is what produces the safe, generic message the API
// client actually sees.
//
// Two distinct failure sources land here: the Hub API health-check calls
// (checkAuth()/checkModelAvailable(), still plain axios) and the
// @huggingface/inference SDK's own error types (generateImage(), migrated
// off raw axios — see huggingface.client.ts and
// docs/HUGGINGFACE_PROVIDER.md's "Provider migration" section for why).
export function describeHuggingFaceError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        return `Hugging Face request timed out: ${error.message}`;
      }
      return `Hugging Face network error: ${error.message}`;
    }

    return describeStatusAndBody(
      error.response.status,
      parseAxiosErrorBody(error.response.data)
    );
  }

  if (error instanceof InferenceClientProviderApiError) {
    return describeStatusAndBody(
      error.httpResponse.status,
      parseProviderErrorBody(error.httpResponse.body)
    );
  }

  if (error instanceof InferenceClientHubApiError) {
    const { status } = error.httpResponse;
    if (status === 401) {
      return "Hugging Face rejected the request: invalid or missing API key";
    }
    if (status === 403) {
      return "Hugging Face rejected the request: forbidden — the configured token may lack permission for this model";
    }
    return `Hugging Face could not resolve an inference provider for the configured model: ${error.message}`;
  }

  if (error instanceof InferenceClientInputError || error instanceof InferenceClientRoutingError) {
    // Thrown client-side by the SDK before any HTTP call to a provider is
    // made (e.g. "No Inference Provider available for model X") — already a
    // clear, safe, Hugging-Face-specific message, not raw HTTP/vendor detail.
    return `Hugging Face request could not be routed: ${error.message}`;
  }

  if (error instanceof InferenceClientProviderOutputError) {
    return `Hugging Face returned an unexpected response: ${error.message}`;
  }

  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return `Hugging Face request timed out: ${error.message}`;
  }

  if (error instanceof TypeError) {
    // Node's fetch (used internally by the SDK) surfaces connection-level
    // failures (DNS, refused connection, ...) as a generic TypeError.
    return `Hugging Face network error: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

function describeStatusAndBody(status: number, body: HuggingFaceErrorResponse | undefined): string {
  const detail = body?.error ? ` — ${body.error}` : "";

  switch (status) {
    case 401:
      return `Hugging Face rejected the request: invalid or missing API key${detail}`;
    case 403:
      return `Hugging Face rejected the request: forbidden — the configured token may lack permission for this model${detail}`;
    case 404:
      return `Hugging Face model not found or unsupported via the selected provider${detail}`;
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

// The image-generation call used to set responseType: "arraybuffer" (needed
// for a successful binary response with the old raw-axios client), so an
// error response's JSON body also arrived as raw bytes rather than being
// parsed automatically — decoded here, defensively, since a non-JSON error
// body (plain text, HTML from an intermediary proxy) is also possible. Still
// used by the Hub API health-check calls, which share the same axios setup.
function parseAxiosErrorBody(data: unknown): HuggingFaceErrorResponse | undefined {
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

// The SDK's InferenceClientProviderApiError already carries a parsed
// JsonObject | string body (no raw-byte decoding needed) — normalized here
// into the same HuggingFaceErrorResponse shape parseAxiosErrorBody()
// produces, so describeStatusAndBody() can treat both sources identically.
function parseProviderErrorBody(body: unknown): HuggingFaceErrorResponse | undefined {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as HuggingFaceErrorResponse;
    } catch {
      return body.trim() ? { error: body.trim() } : undefined;
    }
  }

  return body && typeof body === "object" ? (body as HuggingFaceErrorResponse) : undefined;
}
