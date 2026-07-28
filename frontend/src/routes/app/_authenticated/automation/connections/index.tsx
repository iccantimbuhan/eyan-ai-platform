import { createFileRoute } from '@tanstack/react-router'
import { ConnectionsPage } from '@/features/automation'

export const Route = createFileRoute('/app/_authenticated/automation/connections/')({
  component: ConnectionsPage,
})
