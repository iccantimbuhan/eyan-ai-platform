import { createFileRoute } from '@tanstack/react-router'
import { BrainDetailPage } from '@/features/ai-core/components/brain-detail-page'

export const Route = createFileRoute('/app/_authenticated/ai-core/brains/$brainId')({
  component: BrainDetailPage,
})
