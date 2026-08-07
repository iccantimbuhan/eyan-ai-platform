import { describe, expect, it, vi } from "vitest";

import { SalesChannelMenuItemService } from "./sales-channel-menu-item.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { SalesScopeMismatchError } from "../errors/sales.error.js";
import { Prisma } from "../generated/prisma/client.js";

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "scmi-1",
    restaurantId: "rest-1",
    salesChannelId: "wolt-id",
    menuItemId: "item-1",
    price: new Prisma.Decimal("15.50"),
    available: true,
    salesChannel: { name: "Wolt" },
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  };
}

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findManyByRestaurantId: vi.fn().mockResolvedValue([row()]),
    findManyByMenuItemId: vi.fn().mockResolvedValue([row()]),
    findByChannelAndMenuItem: vi.fn().mockResolvedValue(row()),
    upsert: vi.fn().mockResolvedValue(row()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createSalesChannelRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "wolt-id", restaurantId: "rest-1", name: "Wolt" }),
    ...overrides,
  };
}

function createMenuItemRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "item-1", restaurantId: "rest-1" }),
    ...overrides,
  };
}

function buildService(overrides: {
  repository?: Partial<Record<string, unknown>>;
  salesChannelRepository?: Partial<Record<string, unknown>>;
  menuItemRepository?: Partial<Record<string, unknown>>;
} = {}) {
  return new SalesChannelMenuItemService(
    createRepository(overrides.repository) as never,
    createSalesChannelRepository(overrides.salesChannelRepository) as never,
    createMenuItemRepository(overrides.menuItemRepository) as never
  );
}

describe("SalesChannelMenuItemService", () => {
  it("listByRestaurant() maps rows including the channel name and base-price fallback (null price)", async () => {
    const repository = createRepository({ findManyByRestaurantId: vi.fn().mockResolvedValue([row({ price: null })]) });
    const service = buildService({ repository });

    const result = await service.listByRestaurant("rest-1");

    expect(result[0]).toMatchObject({ channelName: "Wolt", price: null, available: true });
  });

  it("upsert() persists a channel-specific override without touching MenuItem.price", async () => {
    const repository = createRepository();
    const service = buildService({ repository });

    const result = await service.upsert("item-1", "wolt-id", { price: 15.5, available: true });

    expect(repository.upsert).toHaveBeenCalledWith("rest-1", "wolt-id", "item-1", {
      price: 15.5,
      available: true,
    });
    expect(result.price).toBe("15.50");
  });

  it("upsert() throws SalesScopeMismatchError when the channel belongs to a different restaurant", async () => {
    const salesChannelRepository = createSalesChannelRepository({
      findById: vi.fn().mockResolvedValue({ id: "wolt-id", restaurantId: "other-rest", name: "Wolt" }),
    });
    const repository = createRepository();
    const service = buildService({ repository, salesChannelRepository });

    await expect(service.upsert("item-1", "wolt-id", { price: 15.5 })).rejects.toThrow(SalesScopeMismatchError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it("upsert() throws NotFoundError when the menu item doesn't exist", async () => {
    const menuItemRepository = createMenuItemRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService({ menuItemRepository });

    await expect(service.upsert("missing-item", "wolt-id", { price: 15.5 })).rejects.toThrow(NotFoundError);
  });

  it("remove() deletes an existing override", async () => {
    const repository = createRepository();
    const service = buildService({ repository });

    await service.remove("item-1", "wolt-id");

    expect(repository.delete).toHaveBeenCalledWith("wolt-id", "item-1");
  });

  it("remove() throws NotFoundError when no override exists for this channel/item pair", async () => {
    const repository = createRepository({ findByChannelAndMenuItem: vi.fn().mockResolvedValue(null) });
    const service = buildService({ repository });

    await expect(service.remove("item-1", "wolt-id")).rejects.toThrow(NotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
