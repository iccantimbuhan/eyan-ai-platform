import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

const fullInclude = { salesChannel: true } as const;

export type SalesChannelMenuItemWithChannel = Prisma.SalesChannelMenuItemGetPayload<{
  include: typeof fullInclude;
}>;

export interface UpsertSalesChannelMenuItemData {
  price?: Prisma.Decimal | string | number | null;
  available?: boolean;
}

// Sprint 2B Prep — an optional per-channel price/availability override for
// a MenuItem. Restaurant-scoped, read wholesale per restaurant (small
// dataset — a handful of channels x the menu), mutated one (channel, item)
// pair at a time via upsert, mirroring how a manager actually edits it: set
// or clear this channel's price for this one item.
export class SalesChannelMenuItemRepository {
  async findManyByRestaurantId(restaurantId: string) {
    return prisma.salesChannelMenuItem.findMany({
      where: { restaurantId },
      include: fullInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  async findManyByMenuItemId(menuItemId: string) {
    return prisma.salesChannelMenuItem.findMany({
      where: { menuItemId },
      include: fullInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  async findByChannelAndMenuItem(salesChannelId: string, menuItemId: string) {
    return prisma.salesChannelMenuItem.findUnique({
      where: { salesChannelId_menuItemId: { salesChannelId, menuItemId } },
      include: fullInclude,
    });
  }

  async upsert(
    restaurantId: string,
    salesChannelId: string,
    menuItemId: string,
    data: UpsertSalesChannelMenuItemData
  ) {
    return prisma.salesChannelMenuItem.upsert({
      where: { salesChannelId_menuItemId: { salesChannelId, menuItemId } },
      create: {
        restaurantId,
        salesChannelId,
        menuItemId,
        price: data.price ?? null,
        available: data.available ?? true,
      },
      update: {
        price: data.price,
        available: data.available,
      },
      include: fullInclude,
    });
  }

  async delete(salesChannelId: string, menuItemId: string) {
    return prisma.salesChannelMenuItem.delete({
      where: { salesChannelId_menuItemId: { salesChannelId, menuItemId } },
    });
  }
}

export const salesChannelMenuItemRepository = new SalesChannelMenuItemRepository();
