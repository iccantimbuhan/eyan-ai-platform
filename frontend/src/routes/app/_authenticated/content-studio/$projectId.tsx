import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ProjectWorkspace } from '@/features/content-studio/pages/project-workspace'

const projectWorkspaceSearchSchema = z.object({
  tab: z
    .enum([
      'content',
      'images',
      'brand-kits',
      'video',
      'assets',
      'review',
      'publishing',
      'analytics',
    ])
    .optional(),
})

export const Route = createFileRoute(
  '/app/_authenticated/content-studio/$projectId'
)({
  validateSearch: projectWorkspaceSearchSchema,
  component: ProjectWorkspace,
})
