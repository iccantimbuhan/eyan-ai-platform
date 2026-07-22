import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { projects } from '../data/mock'
import { ProjectsEmpty } from './ProjectsEmpty'
import { ProjectsGrid } from './ProjectsGrid'

export function RecentProjects() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>

        <p className='text-sm text-muted-foreground'>
          Your latest AI content workspaces.
        </p>
      </CardHeader>

      <CardContent>
        {projects.length === 0 ? <ProjectsEmpty /> : <ProjectsGrid />}
      </CardContent>
    </Card>
  )
}
