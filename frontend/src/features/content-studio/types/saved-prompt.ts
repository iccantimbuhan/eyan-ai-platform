import type { ContentType } from './content'

export interface SavedPrompt {
  id: string
  userId: string
  projectId: string | null
  name: string
  promptBody: string
  contentType: ContentType
  createdAt: string
  updatedAt: string
}

export interface CreateSavedPromptInput {
  name: string
  promptBody: string
  contentType: ContentType
  // Omitted -> a global, reusable prompt (Prompt Library page, unchanged).
  // Set -> a project-scoped PROMPT_TEMPLATE asset in that project's Asset
  // Library.
  projectId?: string
}

export interface UpdateSavedPromptInput {
  name?: string
  promptBody?: string
  contentType?: ContentType
}
