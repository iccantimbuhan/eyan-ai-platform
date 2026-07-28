import { spawn } from "node:child_process";

import { env } from "../../config/env.js";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

// Sprint 7.2.4 — the provider VideoExecutionEngineService calls for a
// "subtitles" step. Deliberately narrow: extract transcript segments and
// build an SRT string. It never touches a video file directly — burning
// subtitles in remains FFmpegVideoProvider's job (see
// VideoExecutionEngineService's orchestration), same "provider independence"
// posture as FFmpegVideoProvider/no registry (only one real implementation
// exists; a hosted transcription API remains a swappable future option
// behind this same class boundary, not a Map-based registry yet).
export class WhisperTranscriptionProvider {
  // language: "auto" (the planner's default, see SubtitlesStepSchema) lets
  // faster-whisper auto-detect; anything else is passed through verbatim as
  // an ISO language code.
  async transcribe(audioPath: string, language = "auto"): Promise<TranscriptSegment[]> {
    const stdout = await this.spawnWhisper([audioPath, env.whisperModel, language]);
    return parseSegments(stdout);
  }

  // Standard SRT: sequence number, start --> end timestamp line, text,
  // blank line separator. Kept here (not FFmpegVideoProvider) — generating
  // subtitle segments/SRT is this provider's stated responsibility; FFmpeg
  // only ever receives the finished .srt file path to burn in.
  buildSrt(segments: TranscriptSegment[]): string {
    return segments
      .map((segment, index) => {
        const text = segment.text.trim();
        return `${index + 1}\n${formatSrtTimestamp(segment.start)} --> ${formatSrtTimestamp(segment.end)}\n${text}\n`;
      })
      .join("\n");
  }

  // The only place this class shells out. Always an argv array (shell:
  // false, the default), same posture as ffprobe.util.ts/FFmpegVideoProvider
  // — env.whisperPythonPath and the script path are both configuration this
  // process itself owns, never user-supplied.
  private spawnWhisper(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(env.whisperPythonPath, [SCRIPT_PATH, ...args]);

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to start whisper transcription: ${error.message}`));
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`Whisper transcription exited with code ${code}: ${stderr.trim().slice(-2000)}`)
          );
          return;
        }

        resolve(stdout);
      });
    });
  }
}

// backend/python/transcribe.py, resolved relative to this file rather than
// process.cwd() so it's found regardless of the compiled dist/ layout.
const SCRIPT_PATH = new URL("../../../python/transcribe.py", import.meta.url).pathname;

function parseSegments(stdout: string): TranscriptSegment[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Whisper transcription returned malformed output.");
  }

  const segments = (parsed as { segments?: unknown }).segments;

  if (!Array.isArray(segments)) {
    throw new Error("Whisper transcription returned no segments.");
  }

  return segments.map((segment) => ({
    start: Number((segment as { start?: unknown }).start),
    end: Number((segment as { end?: unknown }).end),
    text: String((segment as { text?: unknown }).text ?? ""),
  }));
}

function formatSrtTimestamp(totalSeconds: number): string {
  const totalMs = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
