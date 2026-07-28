import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'

export const Route = createFileRoute('/app/_authenticated/')({
  component: Dashboard,
})
