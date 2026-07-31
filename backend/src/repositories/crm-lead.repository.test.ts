import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findUniqueMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const findManyMock = vi.fn();
const countMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lead: {
      create: createMock,
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      update: updateMock,
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

const { CrmLeadRepository } = await import("./crm-lead.repository.js");

describe("CrmLeadRepository", () => {
  const repository = new CrmLeadRepository();

  beforeEach(() => {
    for (const mock of [createMock, findUniqueMock, findFirstMock, updateMock, findManyMock, countMock]) {
      mock.mockReset();
    }
  });

  it("creates a lead", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      source: "WEBSITE_FORM",
      contactName: "Jane Doe",
      email: "jane@example.com",
      rawSubmission: { contactName: "Jane Doe" },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        source: "WEBSITE_FORM",
        contactName: "Jane Doe",
        email: "jane@example.com",
        rawSubmission: { contactName: "Jane Doe" },
      },
    });
  });

  it("finds a lead by id with activities/aiAnalyses/executionLogs included, newest first", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findById("lead-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        aiAnalyses: { orderBy: { createdAt: "desc" } },
        executionLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  });

  it("finds a lead by email", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findByEmail("jane@example.com");

    expect(findFirstMock).toHaveBeenCalledWith({ where: { email: "jane@example.com" } });
  });

  it("updates status, priority, and lostReason together", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateStatus("lead-1", { status: "LOST", lostReason: "Budget cut" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { status: "LOST", lostReason: "Budget cut" },
    });
  });

  it("updates assignment, allowing null to unassign", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateAssignment("lead-1", null);

    expect(updateMock).toHaveBeenCalledWith({ where: { id: "lead-1" }, data: { assignedToId: null } });
  });

  it("updates status, score, and priority together for a qualification write-back", async () => {
    updateMock.mockResolvedValue({});

    await repository.updateQualification("lead-1", {
      status: "AI_ANALYZED",
      score: 72,
      priority: "MEDIUM",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { status: "AI_ANALYZED", score: 72, priority: "MEDIUM" },
    });
  });

  it("builds a case-insensitive OR search across contactName/email/company", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany({
      skip: 0,
      take: 10,
      sortBy: "createdAt",
      sortDir: "desc",
      search: "acme",
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { contactName: { contains: "acme", mode: "insensitive" } },
          { email: { contains: "acme", mode: "insensitive" } },
          { company: { contains: "acme", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });
  });

  it("counts leads using the same filters as findMany", async () => {
    countMock.mockResolvedValue(3);

    await repository.count({ status: "QUALIFIED" });

    expect(countMock).toHaveBeenCalledWith({ where: { status: "QUALIFIED" } });
  });
});
