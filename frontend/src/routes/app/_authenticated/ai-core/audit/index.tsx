import { createFileRoute } from '@tanstack/react-router'
import { AiAuditPage } from '@/features/ai-core'

export const Route = createFileRoute('/app/_authenticated/ai-core/audit/')({
  component: AiAuditPage,
})
