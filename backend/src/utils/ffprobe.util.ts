import { spawn } from "node:child_process";

export interface FfprobeResult {
  durationMs: number;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  containerFormat: string;
  hasAudio: boolean;
}

// The only thing anything in this codebase actually shells out to. Always
// spawned with an argv array (shell: false, the default) — the file path
// is the sole external input, and it's always a path this process itself
// just wrote via multer's disk storage, never a raw user-supplied string.
// This is also the authoritative "is this really a video file" check: an
// upload that merely has a video-sounding extension/mimetype but isn't a
// real video fails here, not earlier.
export function probeVideoFile(filePath: string): Promise<FfprobeResult> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    ffprobe.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    ffprobe.on("error", (error) => {
      reject(new Error(`Failed to start ffprobe: ${error.message}`));
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
        return;
      }

      try {
        resolve(parseFfprobeOutput(stdout));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

function parseFfprobeOutput(rawJson: string): FfprobeResult {
  const parsed = JSON.parse(rawJson) as {
    format?: { duration?: string; format_name?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
    }>;
  };

  const durationSeconds = Number(parsed.format?.duration);

  if (!parsed.format || Number.isNaN(durationSeconds)) {
    throw new Error("ffprobe output did not include a valid format/duration.");
  }

  const videoStream = parsed.streams?.find((s) => s.codec_type === "video");
  const hasAudio = (parsed.streams ?? []).some((s) => s.codec_type === "audio");

  if (!videoStream) {
    throw new Error("File does not contain a video stream.");
  }

  return {
    durationMs: Math.round(durationSeconds * 1000),
    width: videoStream.width ?? null,
    height: videoStream.height ?? null,
    videoCodec: videoStream.codec_name ?? null,
    // format_name can be a comma-separated list of aliases (e.g.
    // "mov,mp4,m4a,3gp,3g2,mj2") — the first entry is ffprobe's own
    // canonical choice.
    containerFormat: (parsed.format.format_name ?? "unknown").split(",")[0]!,
    hasAudio,
  };
}
