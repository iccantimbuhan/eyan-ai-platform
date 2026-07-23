import type {
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsQueryDto,
} from "../dto/project.dto.js";

import { ProjectRepository } from "../repositories/project.repository.js";

export class ProjectsService {
  constructor(
    private readonly repository = new ProjectRepository(),
  ) {}

  async list(query: ListProjectsQueryDto = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        skip,
        take: pageSize,
        search: query.search,
      }),
      this.repository.count(query.search),
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

  async getById(id: string) {
    return this.repository.findById(id);
  }

  async create(data: CreateProjectDto) {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProjectDto) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
