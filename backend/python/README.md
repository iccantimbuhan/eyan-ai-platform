# Whisper transcription environment

Sprint 7.2.4 — supports `WhisperTranscriptionProvider`
(`backend/src/providers/whisper/whisper-transcription.provider.ts`). Not
committed (`.venv/` is gitignored, same as `node_modules/`); create it once
per environment:

```sh
cd backend
python3 -m venv python/.venv
./python/.venv/bin/pip install faster-whisper
```

`WHISPER_PYTHON_PATH` (defaults to `backend/python/.venv/bin/python3`) and
`WHISPER_MODEL` (defaults to `small`) in `.env` can override the interpreter
location and model size. The first transcription after a fresh install
downloads the model from Hugging Face Hub (a few hundred MB, cached under
`~/.cache/huggingface` afterward) — this requires network access the first
time only.
