import axios from "axios";
import { env } from "../../config/env.js";
import type {
  AIProvider,
  ChatResponse,
  OllamaMessage,
} from "../interfaces/ai-provider.js";

export const SYSTEM_PROMPT =
  "You are Open Source AI Platform, a helpful AI assistant.";

export class OllamaProvider implements AIProvider {
  private readonly client = axios.create({
    baseURL: env.ollamaBaseUrl,
  });

  async listModels() {
    const response = await this.client.get("/api/tags");
    return response.data;
  }

  async chat(messages: OllamaMessage[]): Promise<ChatResponse> {
    const allMessages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await this.client.post("/api/chat", {
      model: env.ollamaModel,
      messages: allMessages,
      stream: false,
    });

    return {
      model: response.data.model,
      response: response.data.message.content,
      createdAt: response.data.created_at,
    };
  }

  async streamChat(messages: OllamaMessage[]) {
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
      },
      {
        responseType: "stream",
      }
    );
  }
}