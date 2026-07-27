import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  InferenceClientHubApiError,
  InferenceClientInputError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientRoutingError,
} from "@huggingface/inference";
import {
  describeHuggingFaceError,
  mapHuggingFaceImageResponse,
} from "./response.mapper.js";

const request = {
  prompt: "a lighthouse at sunset",
  width: 1024,
  height: 768,
  format: "png" as const,
};

function jsonErrorBuffer(body: object): Buffer {
  return Buffer.from(JSON.stringify(body), "utf-8");
}

function axiosErrorWithStatus(status: number, data: Buffer): AxiosError {
  return new AxiosError("Request failed", String(status), undefined, undefined, {
    status,
    statusText: "Error",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data,
  });
}

describe("mapHuggingFaceImageResponse", () => {
  it("maps image/png to format png", () => {
    const result = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "image/png" },
      request,
      "org/model"
    );

    expect(result).toEqual({
      buffer: Buffer.from("x"),
      model: "org/model",
      width: 1024,
      height: 768,
      format: "png",
    });
  });

  it("maps image/jpeg to format jpg", () => {
    const result = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "image/jpeg" },
      request,
      "org/model"
    );

    expect(result.format).toBe("jpg");
  });

  it("maps image/webp to format webp", () => {
    const result = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "image/webp" },
      request,
      "org/model"
    );

    expect(result.format).toBe("webp");
  });

  it("handles a content-type with a charset suffix", () => {
    const result = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "image/png; charset=binary" },
      request,
      "org/model"
    );

    expect(result.format).toBe("png");
  });

  it("falls back to the requested format when content-type is missing or unrecognized", () => {
    const missing = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "" },
      request,
      "org/model"
    );
    const unrecognized = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "application/octet-stream" },
      request,
      "org/model"
    );

    expect(missing.format).toBe("png");
    expect(unrecognized.format).toBe("png");
  });

  it("echoes back the requested width and height", () => {
    const result = mapHuggingFaceImageResponse(
      { buffer: Buffer.from("x"), contentType: "image/png" },
      { ...request, width: 512, height: 256 },
      "org/model"
    );

    expect(result.width).toBe(512);
    expect(result.height).toBe(256);
  });
});

describe("describeHuggingFaceError", () => {
  it("describes a 401 as an invalid/missing API key, including the raw detail", () => {
    const error = axiosErrorWithStatus(
      401,
      jsonErrorBuffer({ error: "Invalid credentials" })
    );

    expect(describeHuggingFaceError(error)).toMatch(
      /invalid or missing API key — Invalid credentials/
    );
  });

  it("describes a 403 as forbidden", () => {
    const error = axiosErrorWithStatus(
      403,
      jsonErrorBuffer({ error: "Model requires a Pro subscription" })
    );

    expect(describeHuggingFaceError(error)).toMatch(
      /forbidden.*Model requires a Pro subscription/
    );
  });

  it("describes a 404 as model not found or unsupported", () => {
    const error = axiosErrorWithStatus(404, jsonErrorBuffer({ error: "Not Found" }));

    expect(describeHuggingFaceError(error)).toMatch(
      /model not found or unsupported/
    );
  });

  it("describes a 429 as rate limited", () => {
    const error = axiosErrorWithStatus(
      429,
      jsonErrorBuffer({ error: "Rate limit reached" })
    );

    expect(describeHuggingFaceError(error)).toMatch(/rate limit exceeded/);
  });

  it("describes a 503 as the model loading, including estimated_time when present", () => {
    const error = axiosErrorWithStatus(
      503,
      jsonErrorBuffer({ error: "Model is loading", estimated_time: 24.3 })
    );

    expect(describeHuggingFaceError(error)).toMatch(
      /model is loading.*not ready in time \(estimated 24\.3s\)/
    );
  });

  it("falls back to a generic status message for an unmapped status code", () => {
    const error = axiosErrorWithStatus(500, jsonErrorBuffer({ error: "Internal error" }));

    expect(describeHuggingFaceError(error)).toMatch(
      /failed with status 500.*Internal error/
    );
  });

  it("handles a non-JSON error body without throwing", () => {
    const error = axiosErrorWithStatus(500, Buffer.from("<html>Bad Gateway</html>"));

    expect(() => describeHuggingFaceError(error)).not.toThrow();
    expect(describeHuggingFaceError(error)).toMatch(/failed with status 500/);
  });

  it("describes a timeout distinctly from other network failures", () => {
    const error = new AxiosError(
      "timeout of 60000ms exceeded",
      "ECONNABORTED"
    );

    expect(describeHuggingFaceError(error)).toMatch(/timed out/);
  });

  it("describes a connection failure as a network error", () => {
    const error = new AxiosError("connect ECONNREFUSED 127.0.0.1:443", "ECONNREFUSED");

    expect(describeHuggingFaceError(error)).toMatch(/network error/);
  });

  it("falls back to the plain message for a non-axios Error", () => {
    expect(describeHuggingFaceError(new Error("boom"))).toBe("boom");
  });

  it("falls back to a generic message for a non-Error throw", () => {
    expect(describeHuggingFaceError("not an error")).toBe("Unknown error");
  });
});

// The axios-based tests above cover the Hub API health-check path
// (checkAuth()/checkModelAvailable(), still plain axios). Generation itself
// goes through the official @huggingface/inference SDK — see
// huggingface.client.ts — which throws its own error types instead of
// AxiosError.
function providerApiError(
  status: number,
  body: Record<string, string | number>
): InferenceClientProviderApiError {
  return new InferenceClientProviderApiError(
    "Request failed",
    { url: "https://router.huggingface.co/hf-inference/models/org/model", method: "POST" },
    { requestId: "req-1", status, body }
  );
}

function hubApiError(status: number, message: string): InferenceClientHubApiError {
  return new InferenceClientHubApiError(
    message,
    { url: "https://huggingface.co/api/models/org/model", method: "GET" },
    { requestId: "req-1", status, body: {} }
  );
}

describe("describeHuggingFaceError (Inference Providers SDK errors)", () => {
  it("describes a 401 provider API error as an invalid/missing API key, including the raw detail", () => {
    const error = providerApiError(401, { error: "Invalid credentials" });

    expect(describeHuggingFaceError(error)).toMatch(
      /invalid or missing API key — Invalid credentials/
    );
  });

  it("describes a 403 provider API error as forbidden", () => {
    const error = providerApiError(403, { error: "Model requires a Pro subscription" });

    expect(describeHuggingFaceError(error)).toMatch(
      /forbidden.*Model requires a Pro subscription/
    );
  });

  it("describes a 404 provider API error as model not found or unsupported via the selected provider", () => {
    const error = providerApiError(404, { error: "Not Found" });

    expect(describeHuggingFaceError(error)).toMatch(
      /model not found or unsupported via the selected provider/
    );
  });

  it("describes a 429 provider API error as rate limited", () => {
    const error = providerApiError(429, { error: "Rate limit reached" });

    expect(describeHuggingFaceError(error)).toMatch(/rate limit exceeded/);
  });

  it("describes a 503 provider API error as the model loading, including estimated_time when present", () => {
    const error = providerApiError(503, { error: "Model is loading", estimated_time: 24.3 });

    expect(describeHuggingFaceError(error)).toMatch(
      /model is loading.*not ready in time \(estimated 24\.3s\)/
    );
  });

  it("handles a plain-string provider error body without throwing", () => {
    const error = providerApiError(500, {});
    // Simulate a non-JSON-object body (a raw string), which
    // InferenceClientProviderApiError's type allows.
    (error.httpResponse as { body: unknown }).body = "Bad Gateway";

    expect(() => describeHuggingFaceError(error)).not.toThrow();
    expect(describeHuggingFaceError(error)).toMatch(/failed with status 500.*Bad Gateway/);
  });

  it("describes a Hub API 401 (resolving a provider for the model) as an invalid/missing API key", () => {
    const error = hubApiError(401, "Unauthorized");

    expect(describeHuggingFaceError(error)).toMatch(/invalid or missing API key/);
  });

  it("describes a Hub API 403 (resolving a provider for the model) as forbidden", () => {
    const error = hubApiError(403, "Forbidden");

    expect(describeHuggingFaceError(error)).toMatch(/forbidden/);
  });

  it("describes any other Hub API failure using the SDK's own routing message", () => {
    const error = hubApiError(
      200,
      "We have not been able to find inference provider information for model org/model."
    );

    expect(describeHuggingFaceError(error)).toMatch(
      /could not resolve an inference provider.*not been able to find inference provider information/
    );
  });

  it("describes a routing failure (no provider serves the model under 'auto') using the SDK's own message", () => {
    const error = new InferenceClientInputError("No Inference Provider available for model org/model.");

    expect(describeHuggingFaceError(error)).toMatch(
      /could not be routed.*No Inference Provider available/
    );
  });

  it("describes an InferenceClientRoutingError the same way as an input error", () => {
    const error = new InferenceClientRoutingError("Specifying a model is required when provider is 'auto'");

    expect(describeHuggingFaceError(error)).toMatch(
      /could not be routed.*Specifying a model is required/
    );
  });

  it("describes a malformed provider response via InferenceClientProviderOutputError", () => {
    const error = new InferenceClientProviderOutputError("Received malformed response from provider");

    expect(describeHuggingFaceError(error)).toMatch(
      /unexpected response.*Received malformed response/
    );
  });

  it("describes a SDK-level timeout distinctly from other network failures", () => {
    const error = Object.assign(new Error("The operation timed out."), { name: "TimeoutError" });

    expect(describeHuggingFaceError(error)).toMatch(/timed out/);
  });

  it("describes an aborted SDK request as a timeout", () => {
    const error = Object.assign(new Error("This operation was aborted"), { name: "AbortError" });

    expect(describeHuggingFaceError(error)).toMatch(/timed out/);
  });

  it("describes a native fetch failure (used internally by the SDK) as a network error", () => {
    const error = new TypeError("fetch failed");

    expect(describeHuggingFaceError(error)).toMatch(/network error/);
  });
});
