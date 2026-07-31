import { createFileRoute } from '@tanstack/react-router'
import { ModelsPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/models/')({
  component: ModelsPage,
})
