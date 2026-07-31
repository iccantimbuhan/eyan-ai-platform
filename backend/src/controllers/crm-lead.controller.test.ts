import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

const createMock = vi.fn();
const listMock = vi.fn();
const getByIdMock = vi.fn();
const updateMock = vi.fn();
const updateStatusMock = vi.fn();
const assignMock = vi.fn();
const addNoteMock = vi.fn();

vi.mock("../services/crm-lead.service.js", () => ({
  CrmLeadService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      create: createMock,
      list: listMock,
      getById: getByIdMock,
      update: updateMock,
      updateStatus: updateStatusMock,
      assign: assignMock,
      addNote: addNoteMock,
    };
  }),
}));

const { CrmLeadController } = await import("./crm-lead.controller.js");

const SAMPLE_LEAD = {
  id: "lead-1",
  contactName: "Jane Doe",
  email: "jane@example.com",
  status: "NEW",
};

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function resetAll() {
  for (const mock of [
    createMock,
    listMock,
    getByIdMock,
    updateMock,
    updateStatusMock,
    assignMock,
    addNoteMock,
  ]) {
    mock.mockReset();
  }
}

describe("CrmLeadController", () => {
  resetAll();

  it("create() passes the public request body through to the service and responds 201", async () => {
    createMock.mockResolvedValue(SAMPLE_LEAD);
    const req = { body: { contactName: "Jane Doe", email: "jane@example.com" } } as unknown as Request;
    const res = createResponse();

    await CrmLeadController.create(req, res);

    expect(createMock).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getOne() propagates a NotFoundError from the service", async () => {
    getByIdMock.mockRejectedValue(new Error("Lead not found."));
    const req = { params: { id: "missing" } } as unknown as Request;
    const res = createResponse();

    await expect(CrmLeadController.getOne(req, res)).rejects.toThrow("Lead not found.");
  });

  it("updateStatus() forwards the lead id, body, and the authenticated actor's id to the service", async () => {
    updateStatusMock.mockResolvedValue({ ...SAMPLE_LEAD, status: "VALIDATED" });
    const req = {
      params: { id: "lead-1" },
      body: { status: "VALIDATED" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await CrmLeadController.updateStatus(req, res);

    expect(updateStatusMock).toHaveBeenCalledWith("lead-1", { status: "VALIDATED" }, "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("assign() forwards the actor's id, distinct from the assignment target", async () => {
    assignMock.mockResolvedValue({ ...SAMPLE_LEAD, assignedToId: "user-2" });
    const req = {
      params: { id: "lead-1" },
      body: { assignedToId: "user-2" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await CrmLeadController.assign(req, res);

    expect(assignMock).toHaveBeenCalledWith("lead-1", { assignedToId: "user-2" }, "user-1");
  });

  it("addNote() responds 201 with the refreshed lead", async () => {
    addNoteMock.mockResolvedValue({ ...SAMPLE_LEAD, activities: [{ type: "NOTE" }] });
    const req = {
      params: { id: "lead-1" },
      body: { body: "Follow up Friday." },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await CrmLeadController.addNote(req, res);

    expect(addNoteMock).toHaveBeenCalledWith("lead-1", { body: "Follow up Friday." }, "user-1");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("list() responds 200 with paginated data", async () => {
    listMock.mockResolvedValue({
      items: [SAMPLE_LEAD],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    const req = { query: {} } as unknown as Request;
    const res = createResponse();

    await CrmLeadController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [SAMPLE_LEAD] })
    );
  });
});
