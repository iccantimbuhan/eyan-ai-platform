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

// 300s: on the production VPS (CPU-only, memory-constrained), the first
// request after a backend restart can hit a cold model load — Ollama
// unloads idle models, and reloading qwen2.5-coder:7b from disk plus
// generating a response has been observed to exceed the previous 180s
// ceiling, surfacing as a false "Unable to connect to AI provider" error
// even though Ollama was reachable and healthy the whole time.
const REQUEST_TIMEOUT_MS = 300_000;

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider implements AIProvider {
  private readonly model: string;
  private readonly client;

  // model/baseUrl default to env config (unchanged, original behavior) but
  // can be overridden by a caller resolving them from AI Core's Brain/
  // RoutingPolicy config instead (ChatService, Sprint 3 Phase 1).
  constructor(options?: OllamaProviderOptions) {
    this.model = options?.model ?? env.ollamaModel;
    this.client = axios.create({
      baseURL: options?.baseUrl ?? env.ollamaBaseUrl,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

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
      model: this.model,
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
        model: this.model,
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