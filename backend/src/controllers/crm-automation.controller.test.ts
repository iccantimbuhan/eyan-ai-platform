import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const findByEmailMock = vi.fn();
const applyValidationResultMock = vi.fn();
const applyQualificationResultMock = vi.fn();

vi.mock("../services/crm-automation-ingest.service.js", () => ({
  CrmAutomationIngestService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      findByEmail: findByEmailMock,
      applyValidationResult: applyValidationResultMock,
      applyQualificationResult: applyQualificationResultMock,
    };
  }),
}));

const { CrmAutomationController } = await import("./crm-automation.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("CrmAutomationController", () => {
  it("findByEmail() responds 200 with `lead: null` when no match is found — not a 404", async () => {
    findByEmailMock.mockResolvedValue(null);
    const req = { query: { email: "nobody@example.com" } } as unknown as Request;
    const res = createResponse();

    await CrmAutomationController.findByEmail(req, res);

    expect(findByEmailMock).toHaveBeenCalledWith("nobody@example.com");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { lead: null } })
    );
  });

  it("applyValidationResult() forwards the lead id and body to the service", async () => {
    applyValidationResultMock.mockResolvedValue({ id: "lead-1", status: "VALIDATED" });
    const req = {
      params: { id: "lead-1" },
      body: { status: "VALIDATED", workflowExecutionId: "exec-1" },
    } as unknown as Request;
    const res = createResponse();

    await CrmAutomationController.applyValidationResult(req, res);

    expect(applyValidationResultMock).toHaveBeenCalledWith("lead-1", req.body);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("applyQualificationResult() forwards the lead id and body to the service", async () => {
    applyQualificationResultMock.mockResolvedValue({ id: "lead-1", status: "AI_ANALYZED" });
    const req = {
      params: { id: "lead-1" },
      body: { leadScore: 72, workflowExecutionId: "exec-2" },
    } as unknown as Request;
    const res = createResponse();

    await CrmAutomationController.applyQualificationResult(req, res);

    expect(applyQualificationResultMock).toHaveBeenCalledWith("lead-1", req.body);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("propagates a service error (e.g. InvalidLeadStatusTransitionError) rather than swallowing it", async () => {
    applyValidationResultMock.mockRejectedValue(new Error("Cannot move a lead from QUALIFIED to VALIDATED."));
    const req = {
      params: { id: "lead-1" },
      body: { status: "VALIDATED", workflowExecutionId: "exec-1" },
    } as unknown as Request;
    const res = createResponse();

    await expect(CrmAutomationController.applyValidationResult(req, res)).rejects.toThrow(
      "Cannot move a lead from QUALIFIED to VALIDATED."
    );
  });
});
