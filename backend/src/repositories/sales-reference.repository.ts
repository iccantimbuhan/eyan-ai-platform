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

  async create(data: { restaurantId: string; name: string; isCashEquivalent?: boolean }) {
    return prisma.salesPaymentMethod.create({ data });
  }

  // The only reference-list update in this sprint (ADR-0043) — lets a
  // manager retroactively flag an existing payment method as physical cash
  // without recreating it.
  async update(id: string, data: { isCashEquivalent: boolean }) {
    return prisma.salesPaymentMethod.update({ where: { id }, data });
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

// POS Source / Sales Channel Flexibility — a fourth Restaurant-scoped
// master list, same shape as the three above. Deliberately no relationship
// to SalesChannel here; the POS-to-channel relationship is captured
// per-entry on SalesChannelEntry.posSourceId instead (see sales-entry
// repository/service), never as a fixed mapping on either master list.
export class PosSourceRepository {
  async findById(id: string) {
    return prisma.posSource.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.posSource.findMany({ where: { restaurantId }, orderBy: { name: "asc" } });
  }

  async findByRestaurantIdAndName(restaurantId: string, name: string) {
    return prisma.posSource.findUnique({ where: { restaurantId_name: { restaurantId, name } } });
  }

  async create(data: { restaurantId: string; name: string }) {
    return prisma.posSource.create({ data });
  }
}

export const salesChannelRepository = new SalesChannelRepository();
export const salesPaymentMethodRepository = new SalesPaymentMethodRepository();
export const salesCategoryRepository = new SalesCategoryRepository();
export const posSourceRepository = new PosSourceRepository();
