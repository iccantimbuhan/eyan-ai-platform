import { prisma } from "../lib/prisma.js";

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

  async assignRole(userId: string, roleId: string) {
    return prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }

  async saveRefreshToken(
    userId: string,
    refreshToken: string
  ) {
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
}

export const userRepository = new UserRepository();
