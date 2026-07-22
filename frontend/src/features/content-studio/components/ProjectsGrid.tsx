import { projects } from '../data/mock'
import { ProjectCard } from './ProjectCard'

export function ProjectsGrid() {
  return (
    <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
