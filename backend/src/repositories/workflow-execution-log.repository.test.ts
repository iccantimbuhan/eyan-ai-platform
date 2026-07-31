import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    workflowExecutionLog: {
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

const { WorkflowExecutionLogRepository } = await import(
  "./workflow-execution-log.repository.js"
);

describe("WorkflowExecutionLogRepository", () => {
  const repository = new WorkflowExecutionLogRepository();

  beforeEach(() => {
    for (const mock of [findFirstMock, createMock, updateMock]) {
      mock.mockReset();
    }
  });

  it("finds an execution by workflowName + n8nExecutionId together", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findByExecutionId("validation", "exec-123");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { workflowName: "validation", n8nExecutionId: "exec-123" },
    });
  });

  it("creates a new execution log row", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      domain: "crm",
      workflowName: "validation",
      leadId: "lead-1",
      n8nExecutionId: "exec-123",
      status: "SUCCESS",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        domain: "crm",
        workflowName: "validation",
        leadId: "lead-1",
        n8nExecutionId: "exec-123",
        status: "SUCCESS",
      },
    });
  });

  it("updates an existing execution log row's status", async () => {
    updateMock.mockResolvedValue({});

    await repository.update("log-1", { status: "FAILED", errorMessage: "timeout" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { status: "FAILED", errorMessage: "timeout" },
    });
  });
});
