import { prisma } from "../lib/prisma.js";

// Three near-identical Restaurant-scoped configurable master lists (Sales
// Foundation, Sprint 2C) — grouped in one file rather than three
// near-duplicate files, mirroring Unit's shape exactly (id/restaurantId/
// name/timestamps) but kept as distinct Prisma models per this codebase's
// existing preference for explicit models over a generic polymorphic table
// (see Unit vs IngredientCategory). No delete in this sprint — matches
// Inventory Foundation's own "no DELETE endpoint yet" minimalism.

export class SalesChannelRepository {
  async findById(id: string) {
    return prisma.salesChannel.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.salesChannel.findMany({ where: { restaurantId }, orderBy: { name: "asc" } });
  }

  async findByRestaurantIdAndName(restaurantId: string, name: string) {
    return prisma.salesChannel.findUnique({ where: { restaurantId_name: { restaurantId, name } } });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.salesChannel.create({ data });
  }
}

export class SalesPaymentMethodRepository {
  async findById(id: string) {
    return prisma.salesPaymentMethod.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.salesPaymentMethod.findMany({ where: { restaurantId }, orderBy: { name: "asc" } });
  }

  async findByRestaurantIdAndName(restaurantId: string, name: string) {
    return prisma.salesPaymentMethod.findUnique({
      where: { restaurantId_name: { restaurantId, name } },
    });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.salesPaymentMethod.create({ data });
  }
}

export class SalesCategoryRepository {
  async findById(id: string) {
    return prisma.salesCategory.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.salesCategory.findMany({ where: { restaurantId }, orderBy: { name: "asc" } });
  }

  async findByRestaurantIdAndName(restaurantId: string, name: string) {
    return prisma.salesCategory.findUnique({ where: { restaurantId_name: { restaurantId, name } } });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.salesCategory.create({ data });
  }
}

export const salesChannelRepository = new SalesChannelRepository();
export const salesPaymentMethodRepository = new SalesPaymentMethodRepository();
export const salesCategoryRepository = new SalesCategoryRepository();
