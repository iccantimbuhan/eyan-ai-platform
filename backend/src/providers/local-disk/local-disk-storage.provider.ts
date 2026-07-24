import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { accessSync, constants as fsConstants, mkdirSync } from "node:fs";
import path from "node:path";

import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import type {
  SaveFileInput,
  SavedFile,
  StorageProvider,
} from "../interfaces/storage-provider.js";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

// Project IDs are Prisma cuids, but this is used directly to build a
// filesystem path — validated defensively rather than trusted, since a
// malformed or hostile value here would otherwise mean path traversal.
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export class LocalDiskStorageProvider implements StorageProvider {
  private readonly rootDir = path.resolve(env.storageLocalRoot);
  private readonly publicBaseUrl = env.storagePublicBaseUrl;

  async save(input: SaveFileInput): Promise<SavedFile> {
    const projectId = assertSafeSegment(input.projectId, "projectId");
    const extension = assertAllowedExtension(input.extension);

    const relativePath = path.join(
      projectId,
      `${randomUUID()}.${extension}`
    );
    const absolutePath = this.resolveWithinRoot(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    logger.info(
      `[LocalDiskStorageProvider] Saved ${relativePath} (${input.buffer.byteLength} bytes)`
    );

    return {
      path: relativePath,
      url: this.getUrl(relativePath),
      bytes: input.buffer.byteLength,
    };
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = this.resolveWithinRoot(filePath);

    await rm(absolutePath, { force: true });

    logger.info(`[LocalDiskStorageProvider] Deleted ${filePath}`);
  }

  getUrl(filePath: string): string {
    const urlPath = filePath.split(path.sep).join("/");
    return `${this.publicBaseUrl}/${urlPath}`;
  }

  private resolveWithinRoot(filePath: string): string {
    const absolutePath = path.resolve(this.rootDir, filePath);

    if (
      absolutePath !== this.rootDir &&
      !absolutePath.startsWith(this.rootDir + path.sep)
    ) {
      throw new Error("Resolved storage path escapes the storage root.");
    }

    return absolutePath;
  }
}

function assertSafeSegment(value: string, field: string): string {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(`Invalid ${field}: must be a safe path segment.`);
  }

  return value;
}

function assertAllowedExtension(extension: string): string {
  const normalized = extension.replace(/^\./, "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(normalized)) {
    throw new Error(`Unsupported file extension: ${extension}`);
  }

  return normalized;
}

// Startup validation (called from app.ts, mirroring env.ts's requireEnv()
// fail-fast philosophy): confirms the configured storage root exists and is
// writable before the process starts accepting requests, rather than
// discovering a bad STORAGE_LOCAL_ROOT on the first real generation.
// Synchronous by design, matching every other startup check in this
// codebase (env.ts, validateImageProviderConfig) — no async orchestration
// needed for a one-time boot check.
export function validateLocalDiskStorageConfig(): void {
  const rootDir = path.resolve(env.storageLocalRoot);

  try {
    mkdirSync(rootDir, { recursive: true });
    accessSync(rootDir, fsConstants.W_OK);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(
      `Local image storage root "${rootDir}" is not writable: ${message}`
    );
  }
}
