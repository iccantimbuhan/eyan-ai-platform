import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

const { WhisperTranscriptionProvider } = await import("./whisper-transcription.provider.js");

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function queueProcess(): FakeChildProcess {
  const child = new FakeChildProcess();
  spawnMock.mockReturnValueOnce(child);
  return child;
}

function succeed(child: FakeChildProcess, stdout: string): void {
  child.stdout.emit("data", Buffer.from(stdout));
  child.emit("close", 0);
}

function fail(child: FakeChildProcess, stderr = "boom"): void {
  child.stderr.emit("data", Buffer.from(stderr));
  child.emit("close", 1);
}

describe("WhisperTranscriptionProvider", () => {
  let provider: InstanceType<typeof WhisperTranscriptionProvider>;

  beforeEach(() => {
    spawnMock.mockReset();
    provider = new WhisperTranscriptionProvider();
  });

  describe("transcribe", () => {
    it("spawns the configured python interpreter with the audio path, model, and language", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav", "en");
      succeed(child, JSON.stringify({ segments: [{ start: 0, end: 1.2, text: "hi" }] }));

      const segments = await promise;

      expect(segments).toEqual([{ start: 0, end: 1.2, text: "hi" }]);
      const [command, args] = spawnMock.mock.calls[0];
      expect(typeof command).toBe("string");
      expect(args).toEqual(expect.arrayContaining(["/tmp/audio.wav", expect.any(String), "en"]));
    });

    it("defaults language to auto", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav");
      succeed(child, JSON.stringify({ segments: [] }));

      await promise;

      const [, args] = spawnMock.mock.calls[0];
      expect(args[args.length - 1]).toBe("auto");
    });

    it("returns an empty array when no speech is detected", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav");
      succeed(child, JSON.stringify({ segments: [] }));

      await expect(promise).resolves.toEqual([]);
    });

    it("rejects when the python process exits non-zero", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav");
      fail(child, "ModuleNotFoundError: No module named 'faster_whisper'");

      await expect(promise).rejects.toThrow(/exited with code 1/);
    });

    it("rejects when stdout is not valid JSON", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav");
      succeed(child, "not json");

      await expect(promise).rejects.toThrow(/malformed output/);
    });

    it("rejects when stdout JSON has no segments array", async () => {
      const child = queueProcess();
      const promise = provider.transcribe("/tmp/audio.wav");
      succeed(child, JSON.stringify({ language: "en" }));

      await expect(promise).rejects.toThrow(/no segments/);
    });
  });

  describe("buildSrt", () => {
    it("formats segments as standard SRT with sequence numbers and timestamps", () => {
      const srt = provider.buildSrt([
        { start: 0, end: 1.5, text: "Hello there" },
        { start: 61.25, end: 63, text: "Second line" },
      ]);

      expect(srt).toBe(
        "1\n00:00:00,000 --> 00:00:01,500\nHello there\n" +
          "\n2\n00:01:01,250 --> 00:01:03,000\nSecond line\n"
      );
    });

    it("returns an empty string for no segments", () => {
      expect(provider.buildSrt([])).toBe("");
    });

    it("trims whitespace from segment text", () => {
      const srt = provider.buildSrt([{ start: 0, end: 1, text: "  padded  " }]);
      expect(srt).toContain("padded\n");
      expect(srt).not.toContain("  padded  ");
    });
  });
});
