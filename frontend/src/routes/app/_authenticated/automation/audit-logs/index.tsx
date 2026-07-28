import { createFileRoute } from '@tanstack/react-router'
import { AuditLogsPage } from '@/features/automation'

export const Route = createFileRoute('/app/_authenticated/automation/audit-logs/')({
  component: AuditLogsPage,
})
