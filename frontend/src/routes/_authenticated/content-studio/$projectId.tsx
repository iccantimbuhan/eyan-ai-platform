import { createFileRoute } from '@tanstack/react-router'

import { ProjectWorkspace } from '@/features/content-studio/pages/project-workspace'

export const Route = createFileRoute(
  '/_authenticated/content-studio/$projectId'
)({
  component: ProjectWorkspace,
})
