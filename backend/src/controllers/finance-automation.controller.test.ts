import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const createExpenseMock = vi.fn();
const getCategoriesMock = vi.fn();
const getDashboardMock = vi.fn();

vi.mock("../services/finance-automation.service.js", () => ({
  FinanceAutomationService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      createExpense: createExpenseMock,
      getCategories: getCategoriesMock,
      getDashboard: getDashboardMock,
    };
  }),
}));

const { FinanceAutomationController } = await import("./finance-automation.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("FinanceAutomationController", () => {
  it("createExpense() forwards the body and responds 200 with a creation message", async () => {
    createExpenseMock.mockResolvedValue({ replayed: false, id: "expense-1" });
    const req = { body: { amount: "12.50", category: "FOOD" } } as unknown as Request;
    const res = createResponse();

    await FinanceAutomationController.createExpense(req, res);

    expect(createExpenseMock).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Expense recorded successfully.",
        data: { replayed: false, id: "expense-1" },
      })
    );
  });

  it("createExpense() responds with a replay-specific message when the execution was already applied", async () => {
    createExpenseMock.mockResolvedValue({ replayed: true, workflowExecutionId: "exec-1" });
    const req = { body: {} } as unknown as Request;
    const res = createResponse();

    await FinanceAutomationController.createExpense(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Expense already recorded for this workflow execution." })
    );
  });

  it("getCategories() responds 200 with the categories payload", async () => {
    getCategoriesMock.mockResolvedValue({ categories: ["FOOD"], paymentMethods: ["CASH"] });
    const req = {} as unknown as Request;
    const res = createResponse();

    await FinanceAutomationController.getCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { categories: ["FOOD"], paymentMethods: ["CASH"] } })
    );
  });

  it("getDashboard() forwards the period query param", async () => {
    getDashboardMock.mockResolvedValue({ period: "2026-08" });
    const req = { query: { period: "2026-08" } } as unknown as Request;
    const res = createResponse();

    await FinanceAutomationController.getDashboard(req, res);

    expect(getDashboardMock).toHaveBeenCalledWith("2026-08");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("propagates a service error rather than swallowing it", async () => {
    createExpenseMock.mockRejectedValue(new Error("Amount must be greater than 0."));
    const req = { body: {} } as unknown as Request;
    const res = createResponse();

    await expect(FinanceAutomationController.createExpense(req, res)).rejects.toThrow(
      "Amount must be greater than 0."
    );
  });
});
