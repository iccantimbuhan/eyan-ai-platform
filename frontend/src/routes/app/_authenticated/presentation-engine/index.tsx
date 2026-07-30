import { createFileRoute } from '@tanstack/react-router'
import { PresentationLauncher } from '@/features/presentation-engine/pages/presentation-launcher'

export const Route = createFileRoute('/app/_authenticated/presentation-engine/')({
  component: PresentationLauncher,
})
