import { prisma } from "../lib/prisma.js";

// Sprint 0 (ADR-0025) — organizationMemberships/restaurantMemberships load
// alongside roles/permissions in this one shared include, so tenant context
// is resolved in the same query authenticate() already runs, with no
// change to authenticate() itself or to the JWT payload.
const userWithRolesInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
  organizationMemberships: true,
  restaurantMemberships: true,
  branchMemberships: true,
} as const;

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: userWithRolesInclude,
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: userWithRolesInclude,
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
      include: userWithRolesInclude,
    });
  }

  async findRoleByName(name: string) {
    return prisma.role.findUnique({
      where: { name },
    });
  }

  async findRolesByNames(names: string[]) {
    return prisma.role.findMany({
      where: {
        name: {
          in: names,
        },
      },
    });
  }

  async createWithRoles(data: {
    name: string;
    email: string;
    passwordHash: string;
    roleIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
        },
      });

      if (data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userWithRolesInclude,
      });
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      isActive?: boolean;
      roleIds?: string[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          isActive: data.isActive,
        },
      });

      if (data.roleIds) {
        await tx.userRole.deleteMany({
          where: {
            userId: id,
          },
        });

        if (data.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: data.roleIds.map((roleId) => ({
              userId: id,
              roleId,
            })),
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: userWithRolesInclude,
      });
    });
  }

  async assignRole(userId: string, roleId: string) {
    return prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    });
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
      },
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
      },
    });
  }

  async deleteRefreshToken(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }

  async findMany(options: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }) {
    const where = {
      ...(options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(options.isActive !== undefined
        ? {
            isActive: options.isActive,
          }
        : {}),
    };

    return prisma.user.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: {
        createdAt: "desc",
      },
      include: userWithRolesInclude,
    });
  }

  async count(options: {
    search?: string;
    isActive?: boolean;
  }) {
    const where = {
      ...(options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(options.isActive !== undefined
        ? {
            isActive: options.isActive,
          }
        : {}),
    };

    return prisma.user.count({
      where,
    });
  }
}

export const userRepository = new UserRepository();
