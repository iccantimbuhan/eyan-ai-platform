import { FolderOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { ContentProject } from '../types/project'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface Props {
  project: ContentProject
}

export function ProjectCard({ project }: Props) {
  return (
    <Card className='cursor-pointer transition-all hover:shadow-md'>
      <CardContent className='space-y-4 p-5'>
        <div className='flex items-center justify-between'>
          <FolderOpen className='h-6 w-6 text-primary' />
          <ProjectStatusBadge status={project.status} />
        </div>

        <div>
          <h3 className='font-semibold'>{project.title}</h3>

          <p className='text-sm text-muted-foreground'>{project.type}</p>
        </div>

        <p className='text-xs text-muted-foreground'>
          Updated {project.updatedAt}
        </p>
      </CardContent>
    </Card>
  )
}
