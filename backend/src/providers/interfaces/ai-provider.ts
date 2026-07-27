import type { AxiosResponse } from "axios";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  model: string;
  response: string;
  createdAt: string;
}

export interface AIModel {
  name: string;
  family: string;
  parameters: string;
  quantization: string;
  size: number;
  capabilities: string[];
}

export interface ChatOptions {
  maxTokens?: number;
}

export interface AIProvider {
  listModels(): Promise<any>;

  chat(
    messages: OllamaMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse>;

  streamChat?(
    messages: OllamaMessage[],
    options?: ChatOptions
  ): Promise<AxiosResponse<any>>;
}