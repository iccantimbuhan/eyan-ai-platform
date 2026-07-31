import { createFileRoute } from '@tanstack/react-router'
import { UsagePage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/usage/')({
  component: UsagePage,
})
