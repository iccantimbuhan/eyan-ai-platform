import { createFileRoute } from '@tanstack/react-router'
import { ProvidersPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/providers/')({
  component: ProvidersPage,
})
