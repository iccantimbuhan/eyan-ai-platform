import { prisma } from "../lib/prisma.js";
import type { TenantRole } from "../generated/prisma/enums.js";

export class OrganizationMemberRepository {
  async findByUserId(userId: string) {
    return prisma.organizationMember.findMany({ where: { userId } });
  }

  async upsert(data: {
    userId: string;
    organizationId: string;
    role: TenantRole;
  }) {
    return prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: data.userId,
          organizationId: data.organizationId,
        },
      },
      update: { role: data.role },
      create: data,
    });
  }
}

export const organizationMemberRepository = new OrganizationMemberRepository();
