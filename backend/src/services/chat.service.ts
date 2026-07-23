import type { Response } from "express";
import { ProviderFactory } from "../providers/provider.factory.js";
import { ApiError } from "../errors/api-error.js";
import type {
  ChatOptions,
  OllamaMessage,
} from "../providers/interfaces/ai-provider.js";

export class ChatService {
  private provider = ProviderFactory.create();

  async chat(messages: OllamaMessage[], options?: ChatOptions) {
    try {
      return await this.provider.chat(messages, options);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }

  async stream(messages: OllamaMessage[], res: Response, options?: ChatOptions) {
    try {
      const response = await this.provider.streamChat?.(messages, options);

      if (!response) {
        throw new ApiError(501, "Streaming not supported.");
      }

      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Transfer-Encoding", "chunked");
      res.flushHeaders();

      response.data.on("error", (error: Error) => {
        console.error("[stream] Upstream stream error", error);
        if (!res.destroyed) {
          res.destroy(error);
        }
      });

      response.data.pipe(res);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }
}
