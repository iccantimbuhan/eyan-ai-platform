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

  // Which registered ImageProvider ImageProviderFactory.create() resolves by
  // default. No provider is registered yet (Sprint 4.1 Phase 3 establishes
  // only the registry itself), so this intentionally has no default value —
  // calling create() today always throws UnsupportedImageProviderError until
  // a concrete provider both exists and is registered under this name.
  imageProvider: process.env.IMAGE_PROVIDER ?? "",

  // Gemini (Google) ImageProvider. Only required when IMAGE_PROVIDER=gemini
  // (or a request explicitly requests provider "gemini") — see
  // validateGeminiProviderConfig() in gemini-image.provider.ts for the
  // fail-fast check, mirroring env.ts's own requireEnv() philosophy without
  // making every provider's key mandatory for every deployment.
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",

  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-image",
};
