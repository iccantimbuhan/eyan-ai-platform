import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/users/components/users-page'

export const Route = createFileRoute('/app/_authenticated/users/')({
  component: UsersPage,
})
