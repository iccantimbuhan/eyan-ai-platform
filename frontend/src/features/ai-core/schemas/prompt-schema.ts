import { z } from 'zod'

export const promptSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, 'Version is required.')
    .regex(/^v[0-9]+$/, 'Version must look like v1, v2, v3, ...'),
  body: z.string().trim().min(1, 'Body is required.'),
})
export type PromptFormValues = z.infer<typeof promptSchema>
export const defaultPromptValues: PromptFormValues = { version: '', body: '' }
