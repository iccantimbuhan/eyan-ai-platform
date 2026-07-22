import { Badge } from '@/components/ui/badge'
import type { ProjectStatus } from '../types/project'

interface Props {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: Props) {
  switch (status) {
    case 'Published':
      return <Badge>{status}</Badge>

    case 'In Progress':
      return <Badge variant='secondary'>{status}</Badge>

    case 'Review':
      return <Badge variant='outline'>{status}</Badge>

    default:
      return <Badge variant='outline'>{status}</Badge>
  }
}
