import { createFileRoute } from '@tanstack/react-router'
import { ProvidersPage } from '@/features/automation'

export const Route = createFileRoute('/_authenticated/automation/providers/')({
  component: ProvidersPage,
})
