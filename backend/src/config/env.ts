import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaModel:
    process.env.OLLAMA_MODEL ?? "llama3.2",
};