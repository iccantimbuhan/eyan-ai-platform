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
import { NotFoundError } from "../errors/auth.error.js";
import { SalesReferenceAlreadyExistsError, SalesScopeMismatchError } from "../errors/sales.error.js";
import { mapSalesPaymentMethodToResponse, mapSalesReferenceToResponse } from "../dto/sales-reference.mapper.js";
import type {
  CreateSalesPaymentMethodDto,
  CreateSalesReferenceDto,
  UpdateSalesPaymentMethodDto,
} from "../dto/sales-reference.dto.js";

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
    return rows.map(mapSalesPaymentMethodToResponse);
  }

  async create(restaurantId: string, data: CreateSalesPaymentMethodDto) {
    const existing = await this.repository.findByRestaurantIdAndName(restaurantId, data.name);
    if (existing) {
      throw new SalesReferenceAlreadyExistsError();
    }

    // isCashEquivalent left undefined (not defaulted to false here) when
    // the caller doesn't specify it, so Prisma's own @default(false) on the
    // column applies — keeps the create payload minimal when a manager
    // just adds a payment method by name and classifies it as cash later.
    const row = await this.repository.create({
      restaurantId,
      name: data.name,
      isCashEquivalent: data.isCashEquivalent,
    });
    return mapSalesPaymentMethodToResponse(row);
  }

  // The only reference-list update in this sprint (ADR-0043) — retroactively
  // flags an existing payment method as physical cash. Scope-checked the
  // same way sales-entry.service.ts checks a client-supplied FK, since this
  // route has no dedicated requireXAccess middleware of its own.
  async update(restaurantId: string, id: string, data: UpdateSalesPaymentMethodDto) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Sales payment method not found.");
    }
    if (existing.restaurantId !== restaurantId) {
      throw new SalesScopeMismatchError("This sales payment method does not belong to the given restaurant.");
    }

    const row = await this.repository.update(id, { isCashEquivalent: data.isCashEquivalent });
    return mapSalesPaymentMethodToResponse(row);
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
