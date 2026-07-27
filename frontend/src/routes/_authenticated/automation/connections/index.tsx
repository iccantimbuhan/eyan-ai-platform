import { createFileRoute } from '@tanstack/react-router'
import { ConnectionsPage } from '@/features/automation'

export const Route = createFileRoute('/_authenticated/automation/connections/')({
  component: ConnectionsPage,
})
