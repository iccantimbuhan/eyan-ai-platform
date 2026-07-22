import dotenv from "dotenv";

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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port,

  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",

  ollamaModel:
    process.env.OLLAMA_MODEL ?? "qwen2.5-coder:14b",

  jwtSecret: requireEnv("JWT_SECRET"),

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ?? "15m",

  refreshTokenSecret: requireEnv("REFRESH_TOKEN_SECRET"),

  refreshTokenExpiresIn:
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
};
