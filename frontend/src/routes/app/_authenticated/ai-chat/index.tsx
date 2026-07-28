import { createFileRoute } from '@tanstack/react-router'
import { AiChat } from '@/features/ai-chat'

export const Route = createFileRoute('/app/_authenticated/ai-chat/')({
  component: AiChat,
})
