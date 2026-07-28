import { createFileRoute } from '@tanstack/react-router'
import { HealthPage } from '@/features/automation'

export const Route = createFileRoute('/app/_authenticated/automation/health/')({
  component: HealthPage,
})
