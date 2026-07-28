import { createFileRoute } from '@tanstack/react-router'
import { Models } from '@/features/models'

export const Route = createFileRoute('/app/_authenticated/models/')({
  component: Models,
})
