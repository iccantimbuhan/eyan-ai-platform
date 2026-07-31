import { z } from 'zod'

export const providerSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required.')
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase kebab-case.'),
  displayName: z.string().trim().min(1, 'Display name is required.'),
  kind: z.enum(['LOCAL', 'HOSTED']),
  baseUrl: z.string().trim().optional(),
  isEnabled: z.boolean(),
})
export type ProviderFormValues = z.infer<typeof providerSchema>
export const defaultProviderValues: ProviderFormValues = {
  key: '',
  displayName: '',
  kind: 'LOCAL',
  baseUrl: '',
  isEnabled: true,
}

export const modelSchema = z.object({
  providerId: z.string().min(1, 'Provider is required.'),
  modelKey: z.string().trim().min(1, 'Model key is required.'),
  displayName: z.string().trim().min(1, 'Display name is required.'),
  tagsText: z.string().trim().optional(),
  isEnabled: z.boolean(),
})
export type ModelFormValues = z.infer<typeof modelSchema>
export const defaultModelValues: ModelFormValues = {
  providerId: '',
  modelKey: '',
  displayName: '',
  tagsText: '',
  isEnabled: true,
}

export function parseTagsText(tagsText: string | undefined): string[] {
  if (!tagsText) return []
  return tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}
