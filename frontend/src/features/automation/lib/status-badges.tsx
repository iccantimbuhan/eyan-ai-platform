import { Badge } from '@/components/ui/badge'
import type { ConnectionStatus, McpHealthStatus } from '../types/automation'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const CONNECTION_STATUS_VARIANT: Record<ConnectionStatus, BadgeVariant> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  EXPIRED: 'destructive',
  REVOKED: 'outline',
  ERROR: 'destructive',
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return <Badge variant={CONNECTION_STATUS_VARIANT[status]}>{status}</Badge>
}

const HEALTH_STATUS_VARIANT: Record<McpHealthStatus, BadgeVariant> = {
  HEALTHY: 'default',
  UNKNOWN: 'secondary',
  UNREACHABLE: 'destructive',
  ERROR: 'destructive',
}

export function HealthStatusBadge({ status }: { status: McpHealthStatus }) {
  return <Badge variant={HEALTH_STATUS_VARIANT[status]}>{status}</Badge>
}
