import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
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
