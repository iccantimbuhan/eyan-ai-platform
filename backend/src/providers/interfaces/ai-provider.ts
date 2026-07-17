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

export interface AIProvider {
  listModels(): Promise<any>;

  chat(messages: OllamaMessage[]): Promise<ChatResponse>;

  streamChat?(
    messages: OllamaMessage[]
  ): Promise<AxiosResponse<any>>;
}