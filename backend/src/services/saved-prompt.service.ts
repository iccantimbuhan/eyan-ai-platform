import type {
  CreateSavedPromptDto,
  UpdateSavedPromptDto,
} from "../dto/saved-prompt.dto.js";

import { SavedPromptRepository } from "../repositories/saved-prompt.repository.js";
import { NotFoundError } from "../errors/auth.error.js";

export class SavedPromptService {
  constructor(
    private readonly repository = new SavedPromptRepository(),
  ) {}

  async create(data: CreateSavedPromptDto, userId: string) {
    return this.repository.create({ ...data, userId });
  }

  async list(userId: string) {
    return this.repository.findMany(userId);
  }

  async getById(id: string, userId: string) {
    const prompt = await this.repository.findById(id, userId);

    if (!prompt) {
      throw new NotFoundError("Saved prompt not found.");
    }

    return prompt;
  }

  async update(id: string, data: UpdateSavedPromptDto, userId: string) {
    await this.getById(id, userId);

    return this.repository.update(id, data);
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}
