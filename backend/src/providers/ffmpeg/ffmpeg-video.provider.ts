import { spawn } from "node:child_process";
import path from "node:path";

import { UnsupportedVideoOperationError } from "../../errors/video-execution.error.js";
import type { WorkflowStep } from "../../validators/video-workflow-plan.validator.js";
import { EXECUTABLE_OPERATION_NAMES, type ExecutableOperation } from "../../constants/workflow-operations.js";

// The subset of the shared EXECUTABLE_OPERATIONS list this provider runs
// directly as a single ffmpeg pass — "subtitles" is also executable
// end-to-end, but as a multi-provider sequence VideoExecutionEngineService
// drives itself (see that file), not via this provider's run().
export const SUPPORTED_OPERATIONS = EXECUTABLE_OPERATION_NAMES.filter(
  (operation): operation is Exclude<ExecutableOperation, "subtitles"> => operation !== "subtitles"
);

export type SupportedFfmpegOperation = (typeof SUPPORTED_OPERATIONS)[number];

// Scale-and-crop-to-fill targets for the resize op's four presets — the
// same common technique used to convert arbitrary source footage into a
// fixed-ratio "Shorts"/"TikTok"-style frame.
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

interface Silence {
  start: number;
  end?: number;
}

// Hides every FFmpeg implementation detail (argv construction, filter
// syntax, codec choice) behind one entry point — VideoExecutionEngineService
// only ever calls run()/isSupported(), it never sees an ffmpeg flag.
// Deliberately no registry/factory: FFmpeg is the one, fully-capable local
// implementation for this milestone's operations — the same judgment call
// Sprint 6.2 already made for text generation and the Sprint 7.2
// architecture review's own conclusion for this exact provider.
export class FFmpegVideoProvider {
  static readonly SUPPORTED_OPERATIONS = SUPPORTED_OPERATIONS;

  isSupported(operation: string): operation is SupportedFfmpegOperation {
    return (SUPPORTED_OPERATIONS as readonly string[]).includes(operation);
  }

  async run(step: WorkflowStep, inputPath: string, outputPath: string): Promise<void> {
    switch (step.operation) {
      case "trim":
        await this.trim(inputPath, outputPath, step.params);
        return;
      case "remove_silence":
        await this.removeSilence(inputPath, outputPath);
        return;
      case "normalize_audio":
        await this.normalizeAudio(inputPath, outputPath);
        return;
      case "resize":
        await this.resize(inputPath, outputPath, step.params);
        return;
      case "brightness":
        await this.brightness(inputPath, outputPath, step.params);
        return;
      default:
        throw new UnsupportedVideoOperationError(step.operation);
    }
  }

  private async trim(
    inputPath: string,
    outputPath: string,
    params: { startSec: number; endSec?: number }
  ): Promise<void> {
    const args = ["-y", "-i", inputPath, "-ss", String(params.startSec)];

    if (params.endSec !== undefined) {
      args.push("-to", String(params.endSec));
    }

    args.push("-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", outputPath);

    await this.spawnFfmpeg(args);
  }

  // Named MVP simplification: trims leading/trailing silence only (one
  // silencedetect pass -> trim to the first/last non-silent boundary),
  // keeping audio and video perfectly in sync by trimming both streams
  // together via the same trim() used above. Removing *interior* silent
  // segments too would need a second pass (concat demuxer stitching the
  // non-silent segments back together) — deferred, see the sprint log.
  private async removeSilence(inputPath: string, outputPath: string): Promise<void> {
    const silences = await this.detectSilences(inputPath);
    const BOUNDARY_EPSILON = 0.15;

    // A silence starting at (or near) 0 is leading silence. A silence with
    // no detected end is one that ran all the way to EOF — trailing
    // silence. Anything else is interior silence, which this pass
    // deliberately leaves alone (see the comment above).
    const leading = silences.find(
      (silence) => silence.start <= BOUNDARY_EPSILON && silence.end !== undefined
    );
    const trailing = silences.find((silence) => silence.end === undefined);

    const startSec = leading?.end ?? 0;
    const endSec = trailing?.start;

    await this.trim(inputPath, outputPath, { startSec, endSec });
  }

  private async detectSilences(inputPath: string): Promise<Silence[]> {
    const stderr = await this.spawnFfmpeg([
      "-i",
      inputPath,
      "-af",
      "silencedetect=noise=-30dB:d=0.5",
      "-f",
      "null",
      "-",
    ]);

    const silences: Silence[] = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map(
      (match) => ({ start: Number(match[1]) })
    );

    [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].forEach((match, index) => {
      if (silences[index]) {
        silences[index].end = Number(match[1]);
      }
    });

    return silences;
  }

  private async normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-af",
      "loudnorm",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      outputPath,
    ];

    await this.spawnFfmpeg(args);
  }

  private async resize(
    inputPath: string,
    outputPath: string,
    params: { aspectRatio: "16:9" | "9:16" | "1:1" | "4:5" }
  ): Promise<void> {
    const target = ASPECT_RATIO_DIMENSIONS[params.aspectRatio];
    const filter = `scale=${target.width}:${target.height}:force_original_aspect_ratio=increase,crop=${target.width}:${target.height}`;

    const args = [
      "-y",
      "-i",
      inputPath,
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      outputPath,
    ];

    await this.spawnFfmpeg(args);
  }

  private async brightness(
    inputPath: string,
    outputPath: string,
    params: { level: number }
  ): Promise<void> {
    // params.level is Zod-bounded to -100..100 -> ffmpeg's eq filter expects
    // -1..1.
    const brightness = params.level / 100;

    const args = [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `eq=brightness=${brightness}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      outputPath,
    ];

    await this.spawnFfmpeg(args);
  }

  // Sprint 7.2.4 — the "extract audio" step of the subtitles pipeline
  // (VideoExecutionEngineService orchestrates: extract -> transcribe ->
  // generate SRT -> burn in). Mono/16kHz PCM is whisper's own expected input
  // shape and keeps the intermediate file small. Not part of the run()
  // switch: subtitles isn't a single ffmpeg pass, it's a multi-provider
  // sequence the engine drives step by step.
  async extractAudio(inputPath: string, outputPath: string): Promise<void> {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ];

    await this.spawnFfmpeg(args);
  }

  // Burns a generated .srt into the video as a permanent, non-toggleable
  // overlay (soft/toggleable subtitle tracks are a future option, not this
  // milestone's). ffmpeg's subtitles filter needs its own internal escaping
  // for colons/backslashes in a path — sidestepped entirely by running with
  // cwd set to the .srt file's own directory and referencing it by bare
  // filename, since every caller (VideoExecutionEngineService) already
  // writes it into a temp working directory it fully controls.
  async burnSubtitles(inputPath: string, srtPath: string, outputPath: string): Promise<void> {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `subtitles=${path.basename(srtPath)}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "copy",
      outputPath,
    ];

    await this.spawnFfmpeg(args, { cwd: path.dirname(srtPath) });
  }

  // The only place this class shells out. Always an argv array (shell:
  // false, the default), never a concatenated string — same posture as
  // ffprobe.util.ts. Resolves with stderr text on a clean exit (silencedetect
  // needs it; every other caller just discards it).
  private spawnFfmpeg(args: string[], options?: { cwd: string }): Promise<string> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", args, options?.cwd ? { cwd: options.cwd } : undefined);

      let stderr = "";

      ffmpeg.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      ffmpeg.on("error", (error) => {
        reject(new Error(`Failed to start ffmpeg: ${error.message}`));
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim().slice(-2000)}`));
          return;
        }

        resolve(stderr);
      });
    });
  }
}
