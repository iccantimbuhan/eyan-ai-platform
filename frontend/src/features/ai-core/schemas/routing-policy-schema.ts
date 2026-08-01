import { z } from 'zod'

const NONE_VALUE = '__none__'

export const routingPolicySchema = z.object({
  strategy: z.enum(['COST', 'LATENCY', 'QUALITY', 'BALANCED']),
  requiredTag: z.string().trim().optional(),
  preferredProviderId: z.string().min(1, 'Preferred provider is required.'),
  preferredModelId: z.string().min(1, 'Preferred model is required.'),
  fallbackProviderId: z.string().optional(),
  fallbackModelId: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10),
  timeoutMs: z.number().int().min(1000),
  confidenceHighThreshold: z.number().min(0).max(1),
  confidenceMediumThreshold: z.number().min(0).max(1),
})
export type RoutingPolicyFormValues = z.infer<typeof routingPolicySchema>

export const defaultRoutingPolicyValues: RoutingPolicyFormValues = {
  strategy: 'BALANCED',
  requiredTag: '',
  preferredProviderId: '',
  preferredModelId: '',
  fallbackProviderId: NONE_VALUE,
  fallbackModelId: NONE_VALUE,
  maxRetries: 3,
  timeoutMs: 60000,
  confidenceHighThreshold: 0.75,
  confidenceMediumThreshold: 0.4,
}

// Select doesn't support an empty-string item value, so "no fallback" is
// represented by this sentinel and translated to undefined at submit time —
// same convention as mcp-server-dialog.tsx's NONE_CONNECTION_VALUE.
export { NONE_VALUE as NONE_FALLBACK_VALUE }
