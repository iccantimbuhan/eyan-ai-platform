import { prisma } from "../lib/prisma.js";

export class OrganizationModuleRepository {
  async findEnabledByOrganizationIds(organizationIds: string[]) {
    if (organizationIds.length === 0) return [];

    return prisma.organizationModule.findMany({
      where: { organizationId: { in: organizationIds }, enabled: true },
    });
  }

  async upsert(data: {
    organizationId: string;
    moduleKey: string;
    enabled: boolean;
  }) {
    return prisma.organizationModule.upsert({
      where: {
        organizationId_moduleKey: {
          organizationId: data.organizationId,
          moduleKey: data.moduleKey,
        },
      },
      update: { enabled: data.enabled },
      create: data,
    });
  }
}

export const organizationModuleRepository = new OrganizationModuleRepository();
