import { Badge } from '@/components/ui/badge'
import type { AiCallOutcome, AiConfidenceTier, McpHealthStatus } from '../types/ai-core'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const HEALTH_STATUS_VARIANT: Record<McpHealthStatus, BadgeVariant> = {
  HEALTHY: 'default',
  UNKNOWN: 'secondary',
  UNREACHABLE: 'destructive',
  ERROR: 'destructive',
}

export function AiHealthStatusBadge({ status }: { status: McpHealthStatus }) {
  return <Badge variant={HEALTH_STATUS_VARIANT[status]}>{status}</Badge>
}

const OUTCOME_VARIANT: Record<AiCallOutcome, BadgeVariant> = {
  VALID: 'default',
  SCHEMA_INVALID: 'secondary',
  TRANSIENT_FAILURE: 'outline',
  DEFINITIVE_FAILURE: 'destructive',
}

export function AiOutcomeBadge({ outcome }: { outcome: AiCallOutcome }) {
  return <Badge variant={OUTCOME_VARIANT[outcome]}>{outcome.replace('_', ' ')}</Badge>
}

const CONFIDENCE_VARIANT: Record<AiConfidenceTier, BadgeVariant> = {
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'destructive',
}

export function AiConfidenceBadge({ confidence }: { confidence: AiConfidenceTier | null }) {
  if (!confidence) return <span className='text-muted-foreground'>—</span>
  return <Badge variant={CONFIDENCE_VARIANT[confidence]}>{confidence}</Badge>
}
