import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    automationServiceApiKey: "",
  },
}));

import { env } from "../config/env.js";
import { authenticateService } from "./service-auth.middleware.js";

function setKey(key: string) {
  (env as { automationServiceApiKey: string }).automationServiceApiKey = key;
}

function createRequest(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as unknown as Request;
}

function createResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("authenticateService", () => {
  beforeEach(() => {
    setKey("");
  });

  it("fails closed with 500 when AUTOMATION_SERVICE_API_KEY is not configured, even with a bearer header present", () => {
    const req = createRequest("Bearer anything");
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a request with no Authorization header", () => {
    setKey("correct-secret");
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a non-Bearer Authorization header", () => {
    setKey("correct-secret");
    const req = createRequest("Basic dXNlcjpwYXNz");
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an incorrect bearer token", () => {
    setKey("correct-secret");
    const req = createRequest("Bearer wrong-secret");
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a token of a different length without throwing (timingSafeEqual guard)", () => {
    setKey("correct-secret");
    const req = createRequest("Bearer short");
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    expect(() => authenticateService(req, res, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() for the correct bearer token", () => {
    setKey("correct-secret");
    const req = createRequest("Bearer correct-secret");
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateService(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
