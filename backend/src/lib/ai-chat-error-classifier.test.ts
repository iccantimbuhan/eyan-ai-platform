import { describe, expect, it } from "vitest";

import { classifyChatError } from "./ai-chat-error-classifier.js";
import {
  AiProviderCallError,
  AiProviderCredentialMissingError,
  UnsupportedAiProviderError,
} from "../errors/ai-core-provider.error.js";

describe("classifyChatError", () => {
  it("classifies a 404 provider response as MODEL_UNAVAILABLE", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "not found", 404));
    expect(result.category).toBe("MODEL_UNAVAILABLE");
    expect(result.httpStatus).toBe(502);
  });

  it("classifies any other 4xx provider response as MODEL_UNAVAILABLE", () => {
    const result = classifyChatError(new AiProviderCallError("openai", "bad request", 400));
    expect(result.category).toBe("MODEL_UNAVAILABLE");
  });

  it("classifies a 408 provider response as TIMEOUT", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "request timeout", 408));
    expect(result.category).toBe("TIMEOUT");
    expect(result.httpStatus).toBe(504);
  });

  it("classifies a 5xx provider response as PROVIDER_UNAVAILABLE", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "server error", 502));
    expect(result.category).toBe("PROVIDER_UNAVAILABLE");
    expect(result.httpStatus).toBe(503);
  });

  it("classifies a network-level ECONNREFUSED (no status code) as PROVIDER_UNAVAILABLE", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "connect ECONNREFUSED", undefined, "ECONNREFUSED"));
    expect(result.category).toBe("PROVIDER_UNAVAILABLE");
  });

  it("classifies a network-level ECONNABORTED (no status code) as TIMEOUT when the model appears loaded", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "timeout of 300000ms exceeded", undefined, "ECONNABORTED"), {
      modelLoaded: true,
    });
    expect(result.category).toBe("TIMEOUT");
  });

  it("classifies the same ECONNABORTED as MODEL_LOADING when the model is not yet loaded", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "timeout of 300000ms exceeded", undefined, "ECONNABORTED"), {
      modelLoaded: false,
    });
    expect(result.category).toBe("MODEL_LOADING");
  });

  it("classifies AiProviderCredentialMissingError as CONFIGURATION_ERROR", () => {
    const result = classifyChatError(new AiProviderCredentialMissingError("openai"));
    expect(result.category).toBe("CONFIGURATION_ERROR");
    expect(result.httpStatus).toBe(500);
  });

  it("classifies UnsupportedAiProviderError as CONFIGURATION_ERROR", () => {
    const result = classifyChatError(new UnsupportedAiProviderError("does-not-exist"));
    expect(result.category).toBe("CONFIGURATION_ERROR");
  });

  it("classifies an unrecognized error as STREAMING_FAILURE when streaming context is set", () => {
    const result = classifyChatError(new Error("something odd"), { streaming: true });
    expect(result.category).toBe("STREAMING_FAILURE");
  });

  it("classifies an unrecognized error as PROVIDER_UNAVAILABLE outside a streaming context", () => {
    const result = classifyChatError(new Error("something odd"), { streaming: false });
    expect(result.category).toBe("PROVIDER_UNAVAILABLE");
  });

  it("never exposes internal error details in the user-facing message", () => {
    const result = classifyChatError(new AiProviderCallError("ollama", "internal vendor stack trace details", 502));
    expect(result.userMessage).not.toContain("internal vendor stack trace details");
  });
});
