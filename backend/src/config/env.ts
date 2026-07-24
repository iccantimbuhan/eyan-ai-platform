import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const port = Number(process.env.PORT ?? "3001");

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number.");
}

const ollamaMaxTokens = Number(process.env.OLLAMA_MAX_TOKENS ?? "500");

if (Number.isNaN(ollamaMaxTokens)) {
  throw new Error("OLLAMA_MAX_TOKENS must be a valid number.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port,

  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",

  ollamaModel:
    process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b",

  ollamaMaxTokens,

  jwtSecret: requireEnv("JWT_SECRET"),

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ?? "15m",

  refreshTokenSecret: requireEnv("REFRESH_TOKEN_SECRET"),

  refreshTokenExpiresIn:
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",

  // Local-disk storage (StorageProvider). Kept outside src/ and dist/ so
  // stored files survive a rebuild; swapping to a cloud StorageProvider
  // later only changes which of these are read, not who reads them.
  storageLocalRoot:
    process.env.STORAGE_LOCAL_ROOT ??
    path.join(process.cwd(), "storage", "images"),

  storagePublicBaseUrl:
    process.env.STORAGE_PUBLIC_BASE_URL ?? "/uploads/images",
};
