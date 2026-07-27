import { createFileRoute } from '@tanstack/react-router'
import { AuditLogsPage } from '@/features/automation'

export const Route = createFileRoute('/_authenticated/automation/audit-logs/')({
  component: AuditLogsPage,
})
