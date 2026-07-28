import { createFileRoute } from '@tanstack/react-router'
import { ProvidersPage } from '@/features/automation'

export const Route = createFileRoute('/app/_authenticated/automation/providers/')({
  component: ProvidersPage,
})
