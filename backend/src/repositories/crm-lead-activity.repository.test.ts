import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    leadActivity: {
      create: createMock,
      findMany: findManyMock,
    },
  },
}));

const { CrmLeadActivityRepository } = await import("./crm-lead-activity.repository.js");

describe("CrmLeadActivityRepository", () => {
  const repository = new CrmLeadActivityRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates an activity row", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      leadId: "lead-1",
      type: "NOTE",
      actorId: "user-1",
      body: "Called, left voicemail.",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        leadId: "lead-1",
        type: "NOTE",
        actorId: "user-1",
        body: "Called, left voicemail.",
      },
    });
  });

  it("finds activities for a lead, newest first", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyForLead("lead-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { leadId: "lead-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
