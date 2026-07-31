import { createFileRoute } from '@tanstack/react-router'
import { AiHealthPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/health/')({
  component: AiHealthPage,
})
