import { createFileRoute } from '@tanstack/react-router'
import { ContentStudio } from '@/features/content-studio'

export const Route = createFileRoute('/app/_authenticated/content-studio/')({
  component: ContentStudio,
})
