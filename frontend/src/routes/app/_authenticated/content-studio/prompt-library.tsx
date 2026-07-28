import { createFileRoute } from '@tanstack/react-router'

import { PromptLibrary } from '@/features/content-studio/pages/prompt-library'

export const Route = createFileRoute(
  '/app/_authenticated/content-studio/prompt-library'
)({
  component: PromptLibrary,
})
