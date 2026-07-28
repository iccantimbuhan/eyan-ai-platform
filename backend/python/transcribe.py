#!/usr/bin/env python3
"""Sprint 7.2.4 -- spawned by WhisperTranscriptionProvider (never invoked
directly by a user). Takes an already-extracted audio file, runs it through
faster-whisper, and prints one JSON object of transcript segments to stdout.
All diagnostics go to stderr so stdout stays parseable JSON only; a non-zero
exit code always means "no usable output was printed".
"""
import json
import sys

from faster_whisper import WhisperModel


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: transcribe.py <audio_path> <model_size> [language]", file=sys.stderr)
        return 1

    audio_path = sys.argv[1]
    model_size = sys.argv[2]
    requested_language = sys.argv[3] if len(sys.argv) > 3 else "auto"
    language = None if requested_language in ("", "auto") else requested_language

    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments_iter, info = model.transcribe(audio_path, language=language, vad_filter=True)

    segments = [
        {"start": segment.start, "end": segment.end, "text": segment.text}
        for segment in segments_iter
    ]

    print(json.dumps({"segments": segments, "language": info.language}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 -- deliberately broad: any failure here must
        # still reach the parent process as a clear stderr message + non-zero exit,
        # never a Python traceback swallowed by a crash.
        print(f"Whisper transcription failed: {exc}", file=sys.stderr)
        sys.exit(1)
