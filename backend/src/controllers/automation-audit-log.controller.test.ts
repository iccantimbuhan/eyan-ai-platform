import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listRecentMock = vi.fn();
const listByConnectionMock = vi.fn();

vi.mock("../services/automation-audit.service.js", () => ({
  AutomationAuditService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      listRecent: listRecentMock,
      listByConnection: listByConnectionMock,
    };
  }),
}));

const { AutomationAuditLogController } = await import(
  "./automation-audit-log.controller.js"
);

const SAMPLE_EVENT = {
  id: "evt-1",
  actorId: "user-1",
  action: "CONNECTION_CREATED",
  targetType: "AutomationConnection",
  targetId: "conn-1",
  metadata: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("AutomationAuditLogController", () => {
  beforeEach(() => {
    listRecentMock.mockReset();
    listByConnectionMock.mockReset();
  });

  it("getRecentAuditLogs() parses page/pageSize from query and paginates the response", async () => {
    listRecentMock.mockResolvedValue({
      data: [SAMPLE_EVENT],
      total: 1,
      page: 2,
      pageSize: 10,
    });
    const req = { query: { page: "2", pageSize: "10" } } as unknown as Request;
    const res = createResponse();

    await AutomationAuditLogController.getRecentAuditLogs(req, res);

    expect(listRecentMock).toHaveBeenCalledWith(2, 10);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { page: 2, pageSize: 10, total: 1, totalPages: 1 },
      })
    );
  });

  it("getRecentAuditLogs() passes undefined through when no query params are given", async () => {
    listRecentMock.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const req = { query: {} } as unknown as Request;
    const res = createResponse();

    await AutomationAuditLogController.getRecentAuditLogs(req, res);

    expect(listRecentMock).toHaveBeenCalledWith(undefined, undefined);
  });

  it("getConnectionAuditLogs() scopes to the connectionId param", async () => {
    listByConnectionMock.mockResolvedValue({
      data: [SAMPLE_EVENT],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const req = {
      params: { connectionId: "conn-1" },
      query: {},
    } as unknown as Request;
    const res = createResponse();

    await AutomationAuditLogController.getConnectionAuditLogs(req, res);

    expect(listByConnectionMock).toHaveBeenCalledWith(
      "conn-1",
      undefined,
      undefined
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
