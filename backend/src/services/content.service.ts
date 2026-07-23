import type {
  GenerateContentDto,
  ListContentQueryDto,
} from "../dto/content.dto.js";

import { ContentRepository } from "../repositories/content.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ChatService } from "./chat.service.js";
import { CONTENT_SYSTEM_PROMPTS } from "../config/content-prompts.js";
import { NotFoundError } from "../errors/auth.error.js";

export class ContentService {
  constructor(
    private readonly repository = new ContentRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly chatService = new ChatService(),
  ) {}

  async generate(data: GenerateContentDto, userId?: string) {
    const project = await this.projectRepository.findById(data.projectId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const result = await this.chatService.chat([
      { role: "system", content: CONTENT_SYSTEM_PROMPTS[data.type] },
      { role: "user", content: data.prompt },
    ]);

    return this.repository.create({
      projectId: data.projectId,
      type: data.type,
      prompt: data.prompt,
      output: result.response,
      model: result.model,
      createdBy: userId ?? null,
    });
  }

  async list(query: ListContentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        projectId: query.projectId,
        skip,
        take: pageSize,
      }),
      this.repository.count(query.projectId),
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
    const content = await this.repository.findById(id);

    if (!content) {
      throw new NotFoundError("Generated content not found.");
    }

    return content;
  }

  async delete(id: string) {
    const content = await this.repository.findById(id);

    if (!content) {
      throw new NotFoundError("Generated content not found.");
    }

    return this.repository.delete(id);
  }
}
