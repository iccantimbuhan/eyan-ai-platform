export type ProjectStatus = 'Draft' | 'In Progress' | 'Review' | 'Published'

export interface ContentProject {
  id: string
  title: string
  type: string
  status: ProjectStatus
  updatedAt: string
}
