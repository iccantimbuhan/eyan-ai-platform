import type { ListImagesQueryDto } from "../dto/image.dto.js";

import { ImageRepository } from "../repositories/image.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { NotFoundError } from "../errors/auth.error.js";

export class ImageService {
  constructor(
    private readonly repository = new ImageRepository(),
    private readonly projectRepository = new ProjectRepository(),
  ) {}

  async list(query: ListImagesQueryDto, userId: string) {
    const project = await this.projectRepository.findById(
      query.projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        projectId: query.projectId,
        userId,
        skip,
        take: pageSize,
      }),
      this.repository.count(query.projectId, userId),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, userId: string) {
    const image = await this.repository.findById(id, userId);

    if (!image) {
      throw new NotFoundError("Generated image not found.");
    }

    return image;
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}
