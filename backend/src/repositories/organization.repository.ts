import { prisma } from "../lib/prisma.js";

export class OrganizationRepository {
  async findById(id: string) {
    return prisma.organization.findUnique({ where: { id } });
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];

    return prisma.organization.findMany({ where: { id: { in: ids } } });
  }

  async create(data: { name: string }) {
    return prisma.organization.create({ data });
  }
}

export const organizationRepository = new OrganizationRepository();
