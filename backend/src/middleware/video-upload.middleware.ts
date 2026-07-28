import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import {
  InvalidVideoFileError,
  NoVideoFileProvidedError,
  VideoUploadTooLargeError,
} from "../errors/video-source.error.js";

// Fast, cheap first-pass rejection by client-supplied mimetype — NOT the
// authoritative check. A file that lies about its mimetype still has to
// pass ffprobe (VideoSourceService) before it becomes a VideoAsset; this
// filter only exists to reject obviously-wrong uploads before they're even
// written to disk.
const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

// Disk storage, never memory storage — multer streams the upload straight
// to env.videoUploadTempDir as it arrives, so the request body is never
// buffered into a Node Buffer. This is the mandatory constraint from the
// Sprint 7.2 architecture review: the backend runs under PM2 with a 500MB
// max_memory_restart ceiling (ecosystem.config.cjs), and a multi-hundred-MB
// video buffered in process memory risks tripping it.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(env.videoUploadTempDir, { recursive: true });
    cb(null, env.videoUploadTempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.videoUploadMaxBytes },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new InvalidVideoFileError(`Unsupported file type: "${file.mimetype}".`));
      return;
    }

    cb(null, true);
  },
}).single("file");

// Wraps multer's callback-style middleware so a rejected/oversized upload
// surfaces as one of this module's ApiError subclasses — errorHandler.ts
// only recognizes ApiError, and a raw MulterError would otherwise fall
// through as a generic 500.
export function videoUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new VideoUploadTooLargeError(env.videoUploadMaxBytes));
        return;
      }

      next(new InvalidVideoFileError(err.message));
      return;
    }

    if (err) {
      next(err);
      return;
    }

    if (!req.file) {
      next(new NoVideoFileProvidedError());
      return;
    }

    next();
  });
}
