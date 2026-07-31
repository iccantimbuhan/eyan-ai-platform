import { createFileRoute } from '@tanstack/react-router'
import { PlaygroundPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/playground/')({
  component: PlaygroundPage,
})
