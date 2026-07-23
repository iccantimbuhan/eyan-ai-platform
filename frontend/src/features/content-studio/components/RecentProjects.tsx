import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useProjects } from '../hooks/use-projects'
import { ProjectsEmpty } from './ProjectsEmpty'
import { ProjectsGrid } from './ProjectsGrid'

export function RecentProjects() {
  const { data, isLoading, isError } = useProjects()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>

          <p className='text-sm text-muted-foreground'>
            Loading projects...
          </p>
        </CardHeader>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>

          <p className='text-sm text-destructive'>
            Failed to load projects.
          </p>
        </CardHeader>
      </Card>
    )
  }

  const projects = data?.items ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>

        <p className='text-sm text-muted-foreground'>
          Your latest AI content workspaces.
        </p>
      </CardHeader>

      <CardContent>
        {projects.length === 0 ? (
          <ProjectsEmpty />
        ) : (
          <ProjectsGrid projects={projects} />
        )}
      </CardContent>
    </Card>
  )
}
