import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/roles'

export const Route = createFileRoute('/app/_authenticated/roles/')({
  component: RolesPage,
})
