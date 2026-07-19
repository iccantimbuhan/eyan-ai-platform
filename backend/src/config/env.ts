import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  port: Number(process.env.PORT ?? 3001),

  // Ollama
  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",

  ollamaModel:
    process.env.OLLAMA_MODEL ?? "llama3.2",

  // JWT
  jwtSecret:
    process.env.JWT_SECRET ??
    "change-this-in-production",

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ?? "15m",

  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET ??
    "change-this-refresh-secret",

  refreshTokenExpiresIn:
    process.env.REFRESH_TOKEN_EXPIRES_IN ??
    "7d",
};