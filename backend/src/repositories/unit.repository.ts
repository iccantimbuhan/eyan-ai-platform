import { prisma } from "../lib/prisma.js";

export class UnitRepository {
  async findById(id: string) {
    return prisma.unit.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.unit.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    });
  }

  async create(data: { restaurantId: string; name: string; abbreviation: string }) {
    return prisma.unit.create({ data });
  }

  async update(id: string, data: { name?: string; abbreviation?: string }) {
    return prisma.unit.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.unit.delete({ where: { id } });
  }
}

export const unitRepository = new UnitRepository();
