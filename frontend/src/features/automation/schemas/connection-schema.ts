import { z } from 'zod'

function isNonEmptyJsonObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length > 0
    )
  } catch {
    return false
  }
}

export const connectionSchema = z.object({
  provider: z.string().trim().min(1, 'Provider is required.').max(100),
  label: z.string().trim().min(1, 'Label is required.').max(200),
  credentialsJson: z
    .string()
    .trim()
    .min(1, 'Credentials are required.')
    .refine(
      isNonEmptyJsonObject,
      'Credentials must be valid, non-empty JSON, e.g. {"apiKey": "..."}.'
    ),
})
export type ConnectionFormValues = z.infer<typeof connectionSchema>
export const defaultConnectionValues: ConnectionFormValues = {
  provider: '',
  label: '',
  credentialsJson: '',
}

export const rotateCredentialsSchema = z.object({
  credentialsJson: z
    .string()
    .trim()
    .min(1, 'Credentials are required.')
    .refine(
      isNonEmptyJsonObject,
      'Credentials must be valid, non-empty JSON, e.g. {"apiKey": "..."}.'
    ),
})
export type RotateCredentialsFormValues = z.infer<typeof rotateCredentialsSchema>
