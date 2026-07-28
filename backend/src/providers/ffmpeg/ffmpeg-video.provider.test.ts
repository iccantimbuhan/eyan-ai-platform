import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

const { FFmpegVideoProvider } = await import("./ffmpeg-video.provider.js");
const { UnsupportedVideoOperationError } = await import(
  "../../errors/video-execution.error.js"
);

class FakeChildProcess extends EventEmitter {
  stderr = new EventEmitter();
}

function queueProcess(): FakeChildProcess {
  const child = new FakeChildProcess();
  spawnMock.mockReturnValueOnce(child);
  return child;
}

function succeed(child: FakeChildProcess, stderr = ""): void {
  if (stderr) child.stderr.emit("data", Buffer.from(stderr));
  child.emit("close", 0);
}

function fail(child: FakeChildProcess, stderr = "boom"): void {
  child.stderr.emit("data", Buffer.from(stderr));
  child.emit("close", 1);
}

describe("FFmpegVideoProvider", () => {
  let provider: InstanceType<typeof FFmpegVideoProvider>;

  beforeEach(() => {
    spawnMock.mockReset();
    provider = new FFmpegVideoProvider();
  });

  describe("isSupported", () => {
    it("recognizes the five executable operations", () => {
      for (const op of ["trim", "remove_silence", "normalize_audio", "resize", "brightness"]) {
        expect(provider.isSupported(op)).toBe(true);
      }
    });

    it("rejects operations planned but not yet executable", () => {
      for (const op of ["subtitles", "blur_faces", "auto_zoom", "background_music", "shorts"]) {
        expect(provider.isSupported(op)).toBe(false);
      }
    });
  });

  describe("run — trim", () => {
    it("spawns ffmpeg with -ss/-to derived from startSec/endSec", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "trim", params: { startSec: 2, endSec: 8 } },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [command, args] = spawnMock.mock.calls[0];
      expect(command).toBe("ffmpeg");
      expect(args).toEqual(
        expect.arrayContaining(["-i", "/tmp/in.mp4", "-ss", "2", "-to", "8", "/tmp/out.mp4"])
      );
      expect(spawnMock.mock.calls[0][2]?.shell).not.toBe(true);
    });

    it("omits -to when endSec is not provided", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "trim", params: { startSec: 3 } },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [, args] = spawnMock.mock.calls[0];
      expect(args).not.toContain("-to");
    });

    it("rejects when ffmpeg exits non-zero", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "trim", params: { startSec: 0 } },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      fail(child, "invalid data found when processing input");

      await expect(promise).rejects.toThrow(/ffmpeg exited with code 1/);
    });
  });

  describe("run — remove_silence", () => {
    // detect and trim are two sequential ffmpeg processes (await, not
    // concurrent) — the second spawn() call only happens a few microtasks
    // after the first process's 'close' event, so each child is driven via
    // vi.waitFor rather than pre-queued, avoiding an EventEmitter listener
    // race.
    function driveTwoProcesses(): { children: FakeChildProcess[] } {
      const children: FakeChildProcess[] = [];
      spawnMock.mockImplementation(() => {
        const child = new FakeChildProcess();
        children.push(child);
        return child;
      });
      return { children };
    }

    it("detects leading/trailing silence then trims both boundaries", async () => {
      const { children } = driveTwoProcesses();

      const promise = provider.run(
        { operation: "remove_silence", params: {} },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );

      await vi.waitFor(() => expect(children.length).toBe(1));
      succeed(
        children[0],
        "[silencedetect] silence_start: 0\n[silencedetect] silence_end: 1.2 | silence_duration: 1.2\n" +
          "[silencedetect] silence_start: 9.5\n"
      );

      await vi.waitFor(() => expect(children.length).toBe(2));
      succeed(children[1]);

      await promise;

      expect(spawnMock).toHaveBeenCalledTimes(2);
      const [, detectArgs] = spawnMock.mock.calls[0];
      expect(detectArgs).toEqual(
        expect.arrayContaining(["-af", "silencedetect=noise=-30dB:d=0.5", "-f", "null", "-"])
      );

      const [, trimArgs] = spawnMock.mock.calls[1];
      expect(trimArgs).toEqual(expect.arrayContaining(["-ss", "1.2", "-to", "9.5"]));
    });

    it("trims nothing when no leading/trailing silence is detected", async () => {
      const { children } = driveTwoProcesses();

      const promise = provider.run(
        { operation: "remove_silence", params: {} },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );

      await vi.waitFor(() => expect(children.length).toBe(1));
      succeed(children[0], "");

      await vi.waitFor(() => expect(children.length).toBe(2));
      succeed(children[1]);

      await promise;

      const [, trimArgs] = spawnMock.mock.calls[1];
      expect(trimArgs).toEqual(expect.arrayContaining(["-ss", "0"]));
      expect(trimArgs).not.toContain("-to");
    });
  });

  describe("run — normalize_audio", () => {
    it("spawns ffmpeg with the loudnorm filter", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "normalize_audio", params: {} },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [, args] = spawnMock.mock.calls[0];
      expect(args).toEqual(expect.arrayContaining(["-af", "loudnorm"]));
    });
  });

  describe("run — resize", () => {
    it("maps the 9:16 preset to a scale+crop filter", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "resize", params: { aspectRatio: "9:16" } },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [, args] = spawnMock.mock.calls[0];
      const filterIndex = args.indexOf("-vf");
      expect(args[filterIndex + 1]).toContain("scale=1080:1920");
      expect(args[filterIndex + 1]).toContain("crop=1080:1920");
    });
  });

  describe("run — brightness", () => {
    it("maps a -100..100 level to ffmpeg's -1..1 eq brightness range", async () => {
      const child = queueProcess();
      const promise = provider.run(
        { operation: "brightness", params: { level: 50 } },
        "/tmp/in.mp4",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [, args] = spawnMock.mock.calls[0];
      const filterIndex = args.indexOf("-vf");
      expect(args[filterIndex + 1]).toBe("eq=brightness=0.5");
    });
  });

  describe("extractAudio", () => {
    it("spawns ffmpeg with mono/16kHz PCM extraction flags", async () => {
      const child = queueProcess();
      const promise = provider.extractAudio("/tmp/in.mp4", "/tmp/out.wav");
      succeed(child);
      await promise;

      const [command, args] = spawnMock.mock.calls[0];
      expect(command).toBe("ffmpeg");
      expect(args).toEqual(
        expect.arrayContaining([
          "-i",
          "/tmp/in.mp4",
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-c:a",
          "pcm_s16le",
          "/tmp/out.wav",
        ])
      );
    });

    it("rejects when ffmpeg exits non-zero", async () => {
      const child = queueProcess();
      const promise = provider.extractAudio("/tmp/in.mp4", "/tmp/out.wav");
      fail(child, "no audio stream found");

      await expect(promise).rejects.toThrow(/ffmpeg exited with code 1/);
    });
  });

  describe("burnSubtitles", () => {
    it("spawns ffmpeg with the subtitles filter, referencing the srt by filename, cwd'd to its directory", async () => {
      const child = queueProcess();
      const promise = provider.burnSubtitles(
        "/tmp/in.mp4",
        "/work/execute-1/step-1-subtitles.srt",
        "/tmp/out.mp4"
      );
      succeed(child);
      await promise;

      const [command, args, options] = spawnMock.mock.calls[0];
      expect(command).toBe("ffmpeg");
      expect(args).toEqual(
        expect.arrayContaining(["-i", "/tmp/in.mp4", "-vf", "subtitles=step-1-subtitles.srt"])
      );
      expect(options).toEqual(expect.objectContaining({ cwd: "/work/execute-1" }));
    });

    it("rejects when ffmpeg exits non-zero", async () => {
      const child = queueProcess();
      const promise = provider.burnSubtitles("/tmp/in.mp4", "/work/x/subs.srt", "/tmp/out.mp4");
      fail(child, "invalid subtitle file");

      await expect(promise).rejects.toThrow(/ffmpeg exited with code 1/);
    });
  });

  describe("run — unsupported operation", () => {
    it("throws UnsupportedVideoOperationError and never spawns ffmpeg", async () => {
      await expect(
        provider.run(
          { operation: "subtitles", params: { language: "auto" } } as never,
          "/tmp/in.mp4",
          "/tmp/out.mp4"
        )
      ).rejects.toThrow(UnsupportedVideoOperationError);

      expect(spawnMock).not.toHaveBeenCalled();
    });
  });
});
