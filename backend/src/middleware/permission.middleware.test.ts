import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { requirePermission } from "./permission.middleware.js";

function createRequest(permissionNames: string[]): Request {
  return {
    user: {
      roles: [
        {
          role: {
            permissions: permissionNames.map((name) => ({
              permission: { name },
            })),
          },
        },
      ],
    },
  } as unknown as Request;
}

function createResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Generic RBAC middleware coverage — no dedicated test existed for this
// file before Sprint 7.1, and Milestone 5 introduces the first routes
// gated by two new permission strings ("automation",
// "automationcredentials") plus reuses a previously-unwired one
// ("auditlogs"), so this exercises requirePermission() itself rather than
// anything automation-specific.
describe("requirePermission", () => {
  it("calls next() when the user has the required permission", () => {
    const req = createRequest(["automation"]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("automation")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 403 when the user lacks the required permission", () => {
    const req = createRequest(["automation"]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("automationcredentials")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You do not have permission to perform this action.",
    });
  });

  it("allows access when the user has any one of several accepted permissions", () => {
    const req = createRequest(["auditlogs"]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("automation", "auditlogs")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("denies access when the user has no roles/permissions at all", () => {
    const req = createRequest([]);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("automation")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("flattens permissions across every role the user has", () => {
    const req = {
      user: {
        roles: [
          { role: { permissions: [{ permission: { name: "automation" } }] } },
          {
            role: {
              permissions: [{ permission: { name: "automationcredentials" } }],
            },
          },
        ],
      },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("automationcredentials")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
