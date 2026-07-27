import { createFileRoute } from '@tanstack/react-router'
import { HealthPage } from '@/features/automation'

export const Route = createFileRoute('/_authenticated/automation/health/')({
  component: HealthPage,
})
