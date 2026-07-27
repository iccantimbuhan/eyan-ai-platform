import dotenv from "dotenv";
import path from "node:path";
import { DEFAULT_HUGGINGFACE_MODEL } from "../providers/huggingface/model.config.js";

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

// Overall budget for a single ComfyUI generation (submit + poll-until-
// complete), in ms — distinct from any single HTTP call's own timeout.
const comfyuiTimeout = Number(process.env.COMFYUI_TIMEOUT ?? "120000");

if (Number.isNaN(comfyuiTimeout)) {
  throw new Error("COMFYUI_TIMEOUT must be a valid number.");
}

const comfyuiPollInterval = Number(process.env.COMFYUI_POLL_INTERVAL ?? "2000");

if (Number.isNaN(comfyuiPollInterval)) {
  throw new Error("COMFYUI_POLL_INTERVAL must be a valid number.");
}

// Single HTTP call timeout for Hugging Face's Inference Providers API, in
// ms — generation is a single request/response round trip (unlike
// ComfyUI's submit-then-poll), so there's no separate "overall budget".
const huggingfaceTimeout = Number(process.env.HUGGINGFACE_TIMEOUT ?? "60000");

if (Number.isNaN(huggingfaceTimeout)) {
  throw new Error("HUGGINGFACE_TIMEOUT must be a valid number.");
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

  // ComfyUI ImageProvider. Only required when IMAGE_PROVIDER=comfyui (or a
  // request explicitly requests provider "comfyui") — see
  // validateComfyUIProviderConfig() in comfyui.provider.ts.
  comfyuiUrl: process.env.COMFYUI_URL ?? "http://127.0.0.1:8188",

  // Name of the workflow template file (without extension) under
  // backend/resources/workflows/ — see workflow.loader.ts.
  comfyuiWorkflow: process.env.COMFYUI_WORKFLOW ?? "sdxl",

  comfyuiTimeout,

  comfyuiPollInterval,

  // Hugging Face ImageProvider. Only required when IMAGE_PROVIDER=huggingface
  // (or a request explicitly requests provider "huggingface") — see
  // validateHuggingFaceProviderConfig() in huggingface.provider.ts.
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY ?? "",

  // No specific model is assumed available on any given account — see
  // model.config.ts, the single source of truth for the default value.
  huggingfaceModel: process.env.HUGGINGFACE_MODEL ?? DEFAULT_HUGGINGFACE_MODEL,

  // Which Inference Providers partner serves the request — passed straight
  // through to the official @huggingface/inference SDK. "auto" (the
  // default, and Hugging Face's own recommended default) lets Hugging
  // Face's router pick whichever live provider currently serves
  // huggingfaceModel, with automatic failover — the model is never assumed
  // to be available on any single named provider (e.g. "hf-inference"),
  // since a provider's own catalog can change or drop a model outright (see
  // docs/HUGGINGFACE_PROVIDER.md for the incident that motivated this).
  // Set to a specific provider name (e.g. "together", "fal-ai") to pin it.
  huggingfaceProvider: process.env.HUGGINGFACE_PROVIDER ?? "auto",

  huggingfaceTimeout,

  // Encrypts AutomationConnection.encryptedCredentials (Sprint 7.1 MCP
  // Foundation) — base64-encoded, must decode to exactly 32 bytes (AES-256).
  // No default, and not required via requireEnv(): the server must still
  // boot for developers not touching the Automation module, exactly like
  // every other provider secret above. CredentialManagerService fails fast
  // with a clear error the first time it's actually needed without one
  // configured, rather than at startup.
  automationEncryptionKey: process.env.AUTOMATION_ENCRYPTION_KEY ?? "",
};
