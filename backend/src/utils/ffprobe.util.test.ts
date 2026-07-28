import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

const { probeVideoFile } = await import("./ffprobe.util.js");

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function emitSuccess(child: FakeChildProcess, stdoutJson: unknown) {
  child.stdout.emit("data", JSON.stringify(stdoutJson));
  child.emit("close", 0);
}

describe("probeVideoFile", () => {
  let child: FakeChildProcess;

  beforeEach(() => {
    spawnMock.mockReset();
    child = new FakeChildProcess();
    spawnMock.mockReturnValue(child);
  });

  it("spawns ffprobe with an argv array (never a shell string) against the given path", async () => {
    const promise = probeVideoFile("/tmp/upload-1.mp4");

    emitSuccess(child, {
      format: { duration: "12.5", format_name: "mov,mp4,m4a,3gp,3g2,mj2" },
      streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080 }],
    });

    await promise;

    expect(spawnMock).toHaveBeenCalledWith("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      "/tmp/upload-1.mp4",
    ]);
  });

  it("resolves duration/dimensions/codec/container from ffprobe's JSON output", async () => {
    const promise = probeVideoFile("/tmp/upload-1.mp4");

    emitSuccess(child, {
      format: { duration: "12.5", format_name: "mov,mp4,m4a,3gp,3g2,mj2" },
      streams: [
        { codec_type: "video", codec_name: "h264", width: 1920, height: 1080 },
        { codec_type: "audio", codec_name: "aac" },
      ],
    });

    await expect(promise).resolves.toEqual({
      durationMs: 12500,
      width: 1920,
      height: 1080,
      videoCodec: "h264",
      containerFormat: "mov",
      hasAudio: true,
    });
  });

  it("reports hasAudio: false when there is no audio stream", async () => {
    const promise = probeVideoFile("/tmp/upload-1.mp4");

    emitSuccess(child, {
      format: { duration: "3", format_name: "webm" },
      streams: [{ codec_type: "video", codec_name: "vp9", width: 640, height: 480 }],
    });

    await expect(promise).resolves.toMatchObject({ hasAudio: false });
  });

  it("rejects when ffprobe exits non-zero", async () => {
    const promise = probeVideoFile("/tmp/bad.mp4");

    child.stderr.emit("data", "Invalid data found when processing input");
    child.emit("close", 1);

    await expect(promise).rejects.toThrow(/ffprobe exited with code 1/);
  });

  it("rejects when ffprobe's output has no video stream", async () => {
    const promise = probeVideoFile("/tmp/audio-only.mp3");

    emitSuccess(child, {
      format: { duration: "5", format_name: "mp3" },
      streams: [{ codec_type: "audio", codec_name: "mp3" }],
    });

    await expect(promise).rejects.toThrow("does not contain a video stream");
  });

  it("rejects when ffprobe's output is not valid JSON", async () => {
    const promise = probeVideoFile("/tmp/upload-1.mp4");

    child.stdout.emit("data", "not json");
    child.emit("close", 0);

    await expect(promise).rejects.toThrow();
  });

  it("rejects when ffprobe fails to start", async () => {
    const promise = probeVideoFile("/tmp/upload-1.mp4");

    child.emit("error", new Error("ENOENT"));

    await expect(promise).rejects.toThrow("Failed to start ffprobe");
  });
});
