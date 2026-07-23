import type {
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsQueryDto,
} from "../dto/project.dto.js";

import { ProjectRepository } from "../repositories/project.repository.js";
import { NotFoundError } from "../errors/auth.error.js";

export class ProjectsService {
  constructor(
    private readonly repository = new ProjectRepository(),
  ) {}

  async list(userId: string, query: ListProjectsQueryDto = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        userId,
        skip,
        take: pageSize,
        search: query.search,
      }),
      this.repository.count(userId, query.search),
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
    const project = await this.repository.findById(id, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return project;
  }

  async create(data: CreateProjectDto, userId: string) {
    return this.repository.create({ ...data, userId });
  }

  async update(id: string, data: UpdateProjectDto, userId: string) {
    await this.getById(id, userId);

    return this.repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}
