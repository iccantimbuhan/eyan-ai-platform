import type { Response } from "express";
import { ProviderFactory } from "../providers/provider.factory.js";
import { ApiError } from "../errors/api-error.js";
import type { OllamaMessage } from "../providers/interfaces/ai-provider.js";

export class ChatService {
  private provider = ProviderFactory.create();

  async chat(messages: OllamaMessage[]) {
    try {
      return await this.provider.chat(messages);
    } catch {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }

  async stream(messages: OllamaMessage[], res: Response) {
    try {
      const response = await this.provider.streamChat?.(messages);

      if (!response) {
        throw new ApiError(501, "Streaming not supported.");
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");

      response.data.pipe(res);
    } catch {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }
}