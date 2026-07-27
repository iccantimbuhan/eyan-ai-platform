import type { CreateBrandKitDto, UpdateBrandKitDto } from "../dto/brand-kit.dto.js";

import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { NotFoundError } from "../errors/auth.error.js";

export class BrandKitService {
  constructor(
    private readonly repository = new BrandKitRepository(),
    private readonly projectRepository = new ProjectRepository()
  ) {}

  async create(data: CreateBrandKitDto, userId: string) {
    const project = await this.projectRepository.findById(data.projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return this.repository.create({ ...data, createdBy: userId });
  }

  async list(projectId: string, userId: string) {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return this.repository.findManyByProject(projectId, userId);
  }

  async getById(id: string, userId: string) {
    const brandKit = await this.repository.findById(id, userId);

    if (!brandKit) {
      throw new NotFoundError("Brand kit not found.");
    }

    return brandKit;
  }

  async update(id: string, data: UpdateBrandKitDto, userId: string) {
    await this.getById(id, userId);

    return this.repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}

export const brandKitService = new BrandKitService();
