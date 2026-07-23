import { prisma } from "../lib/prisma.js";

export class ProjectRepository {
  async findById(id: string) {
    return prisma.contentProject.findUnique({
      where: { id },
    });
  }

  async create(data: {
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
    skip: number;
    take: number;
    search?: string;
  }) {
    return prisma.contentProject.findMany({
      where: options.search
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
        : undefined,

      skip: options.skip,
      take: options.take,

      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async count(search?: string) {
    return prisma.contentProject.count({
      where: search
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
        : undefined,
    });
  }
}

export const projectRepository = new ProjectRepository();
