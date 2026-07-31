import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { requirePermission } from "../../middleware/permission.middleware.js";

// Confirms the CRM routes are gated by the exact "crm" permission key seeded
// in prisma/seed.ts — a typo in either place would otherwise only surface
// as a runtime 403 nobody expects.
function createRequest(permissionNames: string[]): Request {
  return {
    user: {
      roles: [{ role: { permissions: permissionNames.map((name) => ({ permission: { name } })) } }],
    },
  } as unknown as Request;
}

function createResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("CRM leads routes permission gate", () => {
  it("allows a user holding the 'crm' permission", () => {
    const req = createRequest(["crm"]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("crm")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("denies a user without the 'crm' permission, even if they hold unrelated ones", () => {
    const req = createRequest(["finance", "automation"]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("crm")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
