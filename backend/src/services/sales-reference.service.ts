import {
  posSourceRepository,
  PosSourceRepository,
  salesChannelRepository,
  SalesChannelRepository,
  salesCategoryRepository,
  SalesCategoryRepository,
  salesPaymentMethodRepository,
  SalesPaymentMethodRepository,
} from "../repositories/sales-reference.repository.js";
import { SalesReferenceAlreadyExistsError } from "../errors/sales.error.js";
import { mapSalesReferenceToResponse } from "../dto/sales-reference.mapper.js";
import type { CreateSalesReferenceDto } from "../dto/sales-reference.dto.js";

// Three near-identical services — see sales-reference.repository.ts's
// grouping rationale for why these stay one file with three small classes
// instead of one generic "kind"-parameterized service.

export class SalesChannelService {
  constructor(private readonly repository: SalesChannelRepository = salesChannelRepository) {}

  async list(restaurantId: string) {
    const rows = await this.repository.findManyByRestaurantId(restaurantId);
    return rows.map(mapSalesReferenceToResponse);
  }

  async create(restaurantId: string, data: CreateSalesReferenceDto) {
    const existing = await this.repository.findByRestaurantIdAndName(restaurantId, data.name);
    if (existing) {
      throw new SalesReferenceAlreadyExistsError();
    }

    const row = await this.repository.create({ restaurantId, name: data.name });
    return mapSalesReferenceToResponse(row);
  }
}

export class SalesPaymentMethodService {
  constructor(private readonly repository: SalesPaymentMethodRepository = salesPaymentMethodRepository) {}

  async list(restaurantId: string) {
    const rows = await this.repository.findManyByRestaurantId(restaurantId);
    return rows.map(mapSalesReferenceToResponse);
  }

  async create(restaurantId: string, data: CreateSalesReferenceDto) {
    const existing = await this.repository.findByRestaurantIdAndName(restaurantId, data.name);
    if (existing) {
      throw new SalesReferenceAlreadyExistsError();
    }

    const row = await this.repository.create({ restaurantId, name: data.name });
    return mapSalesReferenceToResponse(row);
  }
}

export class SalesCategoryService {
  constructor(private readonly repository: SalesCategoryRepository = salesCategoryRepository) {}

  async list(restaurantId: string) {
    const rows = await this.repository.findManyByRestaurantId(restaurantId);
    return rows.map(mapSalesReferenceToResponse);
  }

  async create(restaurantId: string, data: CreateSalesReferenceDto) {
    const existing = await this.repository.findByRestaurantIdAndName(restaurantId, data.name);
    if (existing) {
      throw new SalesReferenceAlreadyExistsError();
    }

    const row = await this.repository.create({ restaurantId, name: data.name });
    return mapSalesReferenceToResponse(row);
  }
}

// POS Source / Sales Channel Flexibility — a fourth master list, same
// create/list/duplicate-name shape as the three above.
export class PosSourceService {
  constructor(private readonly repository: PosSourceRepository = posSourceRepository) {}

  async list(restaurantId: string) {
    const rows = await this.repository.findManyByRestaurantId(restaurantId);
    return rows.map(mapSalesReferenceToResponse);
  }

  async create(restaurantId: string, data: CreateSalesReferenceDto) {
    const existing = await this.repository.findByRestaurantIdAndName(restaurantId, data.name);
    if (existing) {
      throw new SalesReferenceAlreadyExistsError();
    }

    const row = await this.repository.create({ restaurantId, name: data.name });
    return mapSalesReferenceToResponse(row);
  }
}

export const salesChannelService = new SalesChannelService();
export const salesPaymentMethodService = new SalesPaymentMethodService();
export const salesCategoryService = new SalesCategoryService();
export const posSourceService = new PosSourceService();
