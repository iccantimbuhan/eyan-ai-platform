import { env } from "../config/env.js";

export class HealthService {
  static getStatus() {
    return {
      status: "healthy",
      service: "AI Engineering Platform",
      version: "1.0.0",
      provider: "ollama",
      model: env.ollamaModel,
      timestamp: new Date().toISOString(),
    };
  }
}