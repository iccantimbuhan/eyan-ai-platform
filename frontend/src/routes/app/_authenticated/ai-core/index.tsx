import { createFileRoute } from '@tanstack/react-router'
import { AiCoreDashboardPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/')({
  component: AiCoreDashboardPage,
})
