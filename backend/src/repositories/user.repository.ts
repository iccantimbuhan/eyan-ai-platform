import { prisma } from "../lib/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.USER,
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