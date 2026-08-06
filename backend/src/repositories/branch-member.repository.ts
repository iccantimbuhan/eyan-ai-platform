import { prisma } from "../lib/prisma.js";
import type { TenantRole } from "../generated/prisma/enums.js";

export class BranchMemberRepository {
  async findByUserId(userId: string) {
    return prisma.branchMember.findMany({ where: { userId } });
  }

  async findByBranchIds(branchIds: string[]) {
    if (branchIds.length === 0) return [];

    return prisma.branchMember.findMany({
      where: { branchId: { in: branchIds } },
      include: { user: true },
    });
  }

  async upsert(data: { userId: string; branchId: string; role: TenantRole }) {
    return prisma.branchMember.upsert({
      where: {
        userId_branchId: {
          userId: data.userId,
          branchId: data.branchId,
        },
      },
      update: { role: data.role },
      create: data,
    });
  }

  async delete(userId: string, branchId: string) {
    return prisma.branchMember.deleteMany({ where: { userId, branchId } });
  }

  async deleteManyForUser(userId: string, branchIds: string[]) {
    if (branchIds.length === 0) return { count: 0 };

    return prisma.branchMember.deleteMany({
      where: { userId, branchId: { in: branchIds } },
    });
  }
}

export const branchMemberRepository = new BranchMemberRepository();
