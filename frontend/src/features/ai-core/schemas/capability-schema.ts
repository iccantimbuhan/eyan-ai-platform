import { z } from 'zod'

export const capabilitySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required.')
    .regex(/^[a-z0-9-]+$/, 'Key must be lowercase kebab-case.'),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  description: z.string().trim().min(1, 'Description is required.'),
  brainId: z.string().min(1, 'Brain is required.'),
  isEnabled: z.boolean(),
})
export type CapabilityFormValues = z.infer<typeof capabilitySchema>
export const defaultCapabilityValues: CapabilityFormValues = {
  key: '',
  name: '',
  description: '',
  brainId: '',
  isEnabled: true,
}
