import axios from "axios";
import { env } from "../../config/env.js";
import type {
  AIProvider,
  ChatOptions,
  ChatResponse,
  OllamaMessage,
} from "../interfaces/ai-provider.js";

export const SYSTEM_PROMPT =
  "You are Open Source AI Platform, a helpful AI assistant.";

const REQUEST_TIMEOUT_MS = 180_000;

export class OllamaProvider implements AIProvider {
  private readonly client = axios.create({
    baseURL: env.ollamaBaseUrl,
    timeout: REQUEST_TIMEOUT_MS,
  });

  async listModels() {
    const response = await this.client.get("/api/tags");
    return response.data;
  }

  async chat(
    messages: OllamaMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const allMessages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await this.client.post("/api/chat", {
      model: env.ollamaModel,
      messages: allMessages,
      stream: false,
      options: {
        num_predict: options?.maxTokens ?? env.ollamaMaxTokens,
      },
    });

    return {
      model: response.data.model,
      response: response.data.message.content,
      createdAt: response.data.created_at,
    };
  }

  async streamChat(messages: OllamaMessage[], options?: ChatOptions) {
    const allMessages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    return this.client.post(
      "/api/chat",
      {
        model: env.ollamaModel,
        messages: allMessages,
        stream: true,
        options: {
          num_predict: options?.maxTokens ?? env.ollamaMaxTokens,
        },
      },
      {
        responseType: "stream",
      }
    );
  }
}