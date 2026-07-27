import type { ContentProject } from '../types/project'
import { ProjectCard } from './ProjectCard'

interface Props {
  projects: ContentProject[]
}

export function ProjectsGrid({ projects }: Props) {
  return (
    <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
