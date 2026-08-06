import { branchRepository, BranchRepository } from "../repositories/branch.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapBranchToResponse } from "../dto/branch.mapper.js";
import type { CreateBranchDto, UpdateBranchDto } from "../dto/branch.dto.js";

export class BranchService {
  constructor(private readonly repository: BranchRepository = branchRepository) {}

  async list(restaurantId: string) {
    const branches = await this.repository.findManyByRestaurantId(restaurantId);
    return branches.map(mapBranchToResponse);
  }

  async getById(id: string) {
    const branch = await this.repository.findById(id);

    if (!branch) {
      throw new NotFoundError("Branch not found.");
    }

    return mapBranchToResponse(branch);
  }

  async create(restaurantId: string, data: CreateBranchDto) {
    const branch = await this.repository.create({
      restaurantId,
      name: data.name,
    });

    return mapBranchToResponse(branch);
  }

  async update(id: string, data: UpdateBranchDto) {
    await this.getById(id);

    const branch = await this.repository.update(id, { name: data.name });

    return mapBranchToResponse(branch);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const branchService = new BranchService();
