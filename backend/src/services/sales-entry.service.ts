import {
  dailySalesRecordRepository,
  DailySalesRecordRepository,
} from "../repositories/daily-sales-record.repository.js";
import {
  salesChannelEntryRepository,
  SalesChannelEntryRepository,
  salesCategoryEntryRepository,
  SalesCategoryEntryRepository,
  salesItemEntryRepository,
  SalesItemEntryRepository,
  salesPaymentMethodEntryRepository,
  SalesPaymentMethodEntryRepository,
} from "../repositories/sales-entry.repository.js";
import {
  salesChannelRepository as defaultSalesChannelRepository,
  SalesChannelRepository,
  salesCategoryRepository as defaultSalesCategoryRepository,
  SalesCategoryRepository,
  salesPaymentMethodRepository as defaultSalesPaymentMethodRepository,
  SalesPaymentMethodRepository,
} from "../repositories/sales-reference.repository.js";
import {
  menuItemRepository as defaultMenuItemRepository,
  MenuItemRepository,
} from "../repositories/menu-item.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { SalesEntryAlreadyExistsError, SalesScopeMismatchError } from "../errors/sales.error.js";
import {
  mapCategoryEntryToResponse,
  mapChannelEntryToResponse,
  mapItemEntryToResponse,
  mapPaymentMethodEntryToResponse,
} from "../dto/sales-entry.mapper.js";
import type {
  CreateSalesCategoryEntryDto,
  CreateSalesChannelEntryDto,
  CreateSalesItemEntryDto,
  CreateSalesPaymentMethodEntryDto,
} from "../dto/sales-entry.dto.js";

// One entry-line service per line type — each validates its own
// client-supplied master-list/MenuItem FK against the record's restaurant
// before writing, mirroring InventoryItemService.assertBelongsToRestaurant,
// and re-verifies the entry belongs to the given record before deleting it
// (the route only authorizes :salesId, not :entryId).

async function getRecordOrThrow(repository: DailySalesRecordRepository, dailySalesRecordId: string) {
  const record = await repository.findById(dailySalesRecordId);

  if (!record) {
    throw new NotFoundError("Daily sales record not found.");
  }

  return record;
}

export class SalesChannelEntryService {
  constructor(
    private readonly repository: SalesChannelEntryRepository = salesChannelEntryRepository,
    private readonly recordRepository: DailySalesRecordRepository = dailySalesRecordRepository,
    private readonly channelRepository: SalesChannelRepository = defaultSalesChannelRepository
  ) {}

  async create(dailySalesRecordId: string, data: CreateSalesChannelEntryDto) {
    const record = await getRecordOrThrow(this.recordRepository, dailySalesRecordId);

    const channel = await this.channelRepository.findById(data.salesChannelId);
    if (!channel || channel.restaurantId !== record.restaurantId) {
      throw new SalesScopeMismatchError("This sales channel does not belong to the given branch's restaurant.");
    }

    const existing = await this.repository.findByRecordAndChannel(dailySalesRecordId, data.salesChannelId);
    if (existing) {
      throw new SalesEntryAlreadyExistsError("This channel already has an entry on this sales record.");
    }

    const entry = await this.repository.create({
      dailySalesRecordId,
      branchId: record.branchId,
      salesChannelId: data.salesChannelId,
      amount: data.amount,
    });

    return mapChannelEntryToResponse(entry);
  }

  async delete(dailySalesRecordId: string, entryId: string) {
    const entry = await this.repository.findById(entryId);

    if (!entry || entry.dailySalesRecordId !== dailySalesRecordId) {
      throw new NotFoundError("Sales channel entry not found.");
    }

    await this.repository.delete(entryId);
  }
}

export class SalesPaymentMethodEntryService {
  constructor(
    private readonly repository: SalesPaymentMethodEntryRepository = salesPaymentMethodEntryRepository,
    private readonly recordRepository: DailySalesRecordRepository = dailySalesRecordRepository,
    private readonly paymentMethodRepository: SalesPaymentMethodRepository = defaultSalesPaymentMethodRepository
  ) {}

  async create(dailySalesRecordId: string, data: CreateSalesPaymentMethodEntryDto) {
    const record = await getRecordOrThrow(this.recordRepository, dailySalesRecordId);

    const method = await this.paymentMethodRepository.findById(data.salesPaymentMethodId);
    if (!method || method.restaurantId !== record.restaurantId) {
      throw new SalesScopeMismatchError(
        "This payment method does not belong to the given branch's restaurant."
      );
    }

    const existing = await this.repository.findByRecordAndMethod(
      dailySalesRecordId,
      data.salesPaymentMethodId
    );
    if (existing) {
      throw new SalesEntryAlreadyExistsError("This payment method already has an entry on this sales record.");
    }

    const entry = await this.repository.create({
      dailySalesRecordId,
      branchId: record.branchId,
      salesPaymentMethodId: data.salesPaymentMethodId,
      amount: data.amount,
      transactionCount: data.transactionCount ?? null,
    });

    return mapPaymentMethodEntryToResponse(entry);
  }

  async delete(dailySalesRecordId: string, entryId: string) {
    const entry = await this.repository.findById(entryId);

    if (!entry || entry.dailySalesRecordId !== dailySalesRecordId) {
      throw new NotFoundError("Sales payment method entry not found.");
    }

    await this.repository.delete(entryId);
  }
}

export class SalesCategoryEntryService {
  constructor(
    private readonly repository: SalesCategoryEntryRepository = salesCategoryEntryRepository,
    private readonly recordRepository: DailySalesRecordRepository = dailySalesRecordRepository,
    private readonly categoryRepository: SalesCategoryRepository = defaultSalesCategoryRepository
  ) {}

  async create(dailySalesRecordId: string, data: CreateSalesCategoryEntryDto) {
    const record = await getRecordOrThrow(this.recordRepository, dailySalesRecordId);

    const category = await this.categoryRepository.findById(data.salesCategoryId);
    if (!category || category.restaurantId !== record.restaurantId) {
      throw new SalesScopeMismatchError(
        "This sales category does not belong to the given branch's restaurant."
      );
    }

    const existing = await this.repository.findByRecordAndCategory(dailySalesRecordId, data.salesCategoryId);
    if (existing) {
      throw new SalesEntryAlreadyExistsError("This category already has an entry on this sales record.");
    }

    const entry = await this.repository.create({
      dailySalesRecordId,
      branchId: record.branchId,
      salesCategoryId: data.salesCategoryId,
      quantity: data.quantity ?? null,
      amount: data.amount,
    });

    return mapCategoryEntryToResponse(entry);
  }

  async delete(dailySalesRecordId: string, entryId: string) {
    const entry = await this.repository.findById(entryId);

    if (!entry || entry.dailySalesRecordId !== dailySalesRecordId) {
      throw new NotFoundError("Sales category entry not found.");
    }

    await this.repository.delete(entryId);
  }
}

export class SalesItemEntryService {
  constructor(
    private readonly repository: SalesItemEntryRepository = salesItemEntryRepository,
    private readonly recordRepository: DailySalesRecordRepository = dailySalesRecordRepository,
    private readonly menuItemRepository: MenuItemRepository = defaultMenuItemRepository
  ) {}

  // menuItemId is optional — a manager can record "Margherita" by name
  // without linking it to a MenuItem at all. When supplied, it must belong
  // to the record's own restaurant.
  async create(dailySalesRecordId: string, data: CreateSalesItemEntryDto) {
    const record = await getRecordOrThrow(this.recordRepository, dailySalesRecordId);

    if (data.menuItemId) {
      const menuItem = await this.menuItemRepository.findById(data.menuItemId);
      if (!menuItem || menuItem.restaurantId !== record.restaurantId) {
        throw new SalesScopeMismatchError("This menu item does not belong to the given branch's restaurant.");
      }
    }

    const entry = await this.repository.create({
      dailySalesRecordId,
      branchId: record.branchId,
      menuItemId: data.menuItemId ?? null,
      itemName: data.itemName,
      categoryName: data.categoryName ?? null,
      quantity: data.quantity,
      amount: data.amount,
      posQuantityPercent: data.posQuantityPercent ?? null,
      posSalesPercent: data.posSalesPercent ?? null,
    });

    return mapItemEntryToResponse(entry);
  }

  async delete(dailySalesRecordId: string, entryId: string) {
    const entry = await this.repository.findById(entryId);

    if (!entry || entry.dailySalesRecordId !== dailySalesRecordId) {
      throw new NotFoundError("Sales item entry not found.");
    }

    await this.repository.delete(entryId);
  }
}

export const salesChannelEntryService = new SalesChannelEntryService();
export const salesPaymentMethodEntryService = new SalesPaymentMethodEntryService();
export const salesCategoryEntryService = new SalesCategoryEntryService();
export const salesItemEntryService = new SalesItemEntryService();
