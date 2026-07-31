import { createFileRoute } from '@tanstack/react-router'
import { BrainsPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/brains/')({
  component: BrainsPage,
})
