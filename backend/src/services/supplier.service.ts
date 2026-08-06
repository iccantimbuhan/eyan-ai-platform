import { supplierRepository, SupplierRepository } from "../repositories/supplier.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapSupplierToResponse } from "../dto/supplier.mapper.js";
import type { CreateSupplierDto, UpdateSupplierDto } from "../dto/supplier.dto.js";

export class SupplierService {
  constructor(private readonly repository: SupplierRepository = supplierRepository) {}

  async list(restaurantId: string) {
    const suppliers = await this.repository.findManyByRestaurantId(restaurantId);
    return suppliers.map(mapSupplierToResponse);
  }

  async getById(id: string) {
    const supplier = await this.repository.findById(id);

    if (!supplier) {
      throw new NotFoundError("Supplier not found.");
    }

    return mapSupplierToResponse(supplier);
  }

  async create(restaurantId: string, data: CreateSupplierDto) {
    const supplier = await this.repository.create({
      restaurantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    });

    return mapSupplierToResponse(supplier);
  }

  async update(id: string, data: UpdateSupplierDto) {
    await this.getById(id);

    const supplier = await this.repository.update(id, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    });

    return mapSupplierToResponse(supplier);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const supplierService = new SupplierService();
