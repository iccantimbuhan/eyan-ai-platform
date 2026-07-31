import { z } from 'zod'

export const brainSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required.')
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase kebab-case.'),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  description: z.string().trim().min(1, 'Description is required.'),
  category: z.string().trim().min(1, 'Category is required.'),
  memoryStrategy: z.enum(['NONE', 'CONVERSATION', 'KNOWLEDGE_BASE', 'VECTOR', 'RAG', 'LONG_TERM']),
  isEnabled: z.boolean(),
})
export type BrainFormValues = z.infer<typeof brainSchema>
export const defaultBrainValues: BrainFormValues = {
  key: '',
  name: '',
  description: '',
  category: '',
  memoryStrategy: 'NONE',
  isEnabled: true,
}
