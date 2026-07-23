import type { ContentType } from './content'

export interface SavedPrompt {
  id: string
  userId: string
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
}

export interface UpdateSavedPromptInput {
  name?: string
  promptBody?: string
  contentType?: ContentType
}
