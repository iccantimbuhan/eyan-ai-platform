import { createFileRoute } from '@tanstack/react-router'
import { CapabilitiesPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/capabilities/')({
  component: CapabilitiesPage,
})
