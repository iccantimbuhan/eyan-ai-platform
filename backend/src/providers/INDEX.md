# backend/src/providers — Index

No naming convention ties these subdirectories together (unlike `services/`/`controllers/`/`repositories/`'s `<domain>.<layer>.ts` pattern) — this file exists because the name alone doesn't tell you what's inside.

| Subdir | What it is |
|---|---|
| `interfaces/` | Shared TypeScript interfaces every provider below implements. Not an implementation itself — start here to see a provider's contract. |
| `ai-core/` | AI Core's own provider plugins (Ollama/OpenAI/Anthropic/Gemini), registered in `AiCoreProviderFactory`. See `.context/ai-core.md`. |
| `ollama/` | The original, pre-AI-Core single-provider implementation (`OllamaProvider`) still used by the not-yet-migrated Chat feature. Not the same as `ai-core/ollama.ai-provider.ts` above — see `.context/ai-core.md`'s rollout status. |
| `comfyui/` | Self-hosted ComfyUI image generation. |
| `gemini/` | Google Gemini image generation. |
| `huggingface/` | Hugging Face Inference Providers image generation. |
| `ffmpeg/` | Local FFmpeg-based video editing operations (trim, normalize, resize, subtitles, etc.). |
| `whisper/` | Local `faster-whisper` transcription, used for video subtitle generation. |
| `local-disk/` | `StorageProvider` implementation — local filesystem. Swappable for cloud storage without touching callers. |
| `mcp/` | MCP connector implementations. Only `FakeMcpConnector` is live — see `.context/automation.md`. |
| `fake/` | Deterministic fake providers (image generation, publishing) used where no real integration exists yet. Not test mocks — these can be registered in production config. |
