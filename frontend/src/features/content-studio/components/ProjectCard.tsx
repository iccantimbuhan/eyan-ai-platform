import { FolderOpen } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Card, CardContent } from '@/components/ui/card'

import type { ContentProject } from '../types/project'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface Props {
  project: ContentProject
}

export function ProjectCard({ project }: Props) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
      onClick={() =>
        navigate({
          to: '/app/content-studio/$projectId',
          params: {
            projectId: project.id,
          },
        })
      }
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <FolderOpen className="h-6 w-6 text-primary" />
          <ProjectStatusBadge status={project.status} />
        </div>

        <div>
          <h3 className="font-semibold">{project.title}</h3>

          <p className="text-sm text-muted-foreground">
            {project.type}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Updated {project.updatedAt}
        </p>
      </CardContent>
    </Card>
  )
}
