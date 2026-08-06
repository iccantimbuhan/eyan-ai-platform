import { prisma } from "../lib/prisma.js";

export interface CreateSupplierData {
  restaurantId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierData {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export class SupplierRepository {
  async findById(id: string) {
    return prisma.supplier.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string) {
    return prisma.supplier.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    });
  }

  async findManyByIds(ids: string[]) {
    return prisma.supplier.findMany({ where: { id: { in: ids } } });
  }

  async create(data: CreateSupplierData) {
    return prisma.supplier.create({ data });
  }

  async update(id: string, data: UpdateSupplierData) {
    return prisma.supplier.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.supplier.delete({ where: { id } });
  }
}

export const supplierRepository = new SupplierRepository();
