import { prisma } from "../lib/prisma.js";

export class ProjectRepository {
  async findById(id: string, userId: string) {
    return prisma.contentProject.findFirst({
      where: { id, userId },
    });
  }

  async create(data: {
    userId: string;
    name: string;
    description?: string;
  }) {
    return prisma.contentProject.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
    }
  ) {
    return prisma.contentProject.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.contentProject.delete({
      where: { id },
    });
  }

  async findMany(options: {
    userId: string;
    skip: number;
    take: number;
    search?: string;
  }) {
    return prisma.contentProject.findMany({
      where: {
        userId: options.userId,
        ...(options.search
          ? {
              OR: [
                {
                  name: {
                    contains: options.search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: options.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },

      skip: options.skip,
      take: options.take,

      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async count(userId: string, search?: string) {
    return prisma.contentProject.count({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
    });
  }
}

export const projectRepository = new ProjectRepository();
