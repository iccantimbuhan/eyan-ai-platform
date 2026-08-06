import { unitRepository, UnitRepository } from "../repositories/unit.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapUnitToResponse } from "../dto/unit.mapper.js";
import type { CreateUnitDto, UpdateUnitDto } from "../dto/unit.dto.js";

export class UnitService {
  constructor(private readonly repository: UnitRepository = unitRepository) {}

  async list(restaurantId: string) {
    const units = await this.repository.findManyByRestaurantId(restaurantId);
    return units.map(mapUnitToResponse);
  }

  async getById(id: string) {
    const unit = await this.repository.findById(id);

    if (!unit) {
      throw new NotFoundError("Unit not found.");
    }

    return mapUnitToResponse(unit);
  }

  async create(restaurantId: string, data: CreateUnitDto) {
    const unit = await this.repository.create({
      restaurantId,
      name: data.name,
      abbreviation: data.abbreviation,
    });

    return mapUnitToResponse(unit);
  }

  async update(id: string, data: UpdateUnitDto) {
    await this.getById(id);

    const unit = await this.repository.update(id, {
      name: data.name,
      abbreviation: data.abbreviation,
    });

    return mapUnitToResponse(unit);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const unitService = new UnitService();
