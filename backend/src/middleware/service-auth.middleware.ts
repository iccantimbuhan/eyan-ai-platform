import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

// ADR-0019 Decision 2 — service-to-service auth for /api/v1/crm/service/*,
// distinct from authenticate (user JWTs) and from AutomationConnection
// (per-user credentials, ADR-0012). No req.user is set by this middleware:
// callers are "n8n", not a person.
export function authenticateService(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!env.automationServiceApiKey) {
    return res.status(500).json({
      success: false,
      message: "Service authentication is not configured.",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Service authentication required.",
    });
  }

  const provided = Buffer.from(authHeader.substring(7));
  const expected = Buffer.from(env.automationServiceApiKey);

  // Length must match before timingSafeEqual is called — it throws on
  // mismatched buffer lengths rather than returning false.
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid service credentials.",
    });
  }

  next();
}
