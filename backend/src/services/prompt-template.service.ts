import type { ListPromptTemplatesQueryDto } from "../dto/prompt-template.dto.js";
import { PromptTemplateRepository } from "../repositories/prompt-template.repository.js";

export class PromptTemplateService {
  constructor(
    private readonly repository = new PromptTemplateRepository(),
  ) {}

  async list(query: ListPromptTemplatesQueryDto = {}) {
    return this.repository.findMany({
      category: query.category,
      contentType: query.contentType,
    });
  }
}
