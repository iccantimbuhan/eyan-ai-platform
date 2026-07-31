import { createFileRoute } from '@tanstack/react-router'
import { CostsPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/costs/')({
  component: CostsPage,
})
